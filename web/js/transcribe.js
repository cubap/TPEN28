var tpen = {
    project: {
        id: 0,
        tools: [],
        userTools:[],
        leaders: [],
        buttons: [],
        hotkeys: [],
        xml: [],
        specialChars:[],
        permissions: [],
        metadata: [],
        folios: [],
        user_list: [],
        leader_list: [],
        projectName: "",
        groupID:0,
        linebreakSymbol:"",
        remainingText:"",
        projectImageBounding:"",
        linebreakCharacterLimit:0
    },
    manifest: {

    },
    screen:{
        focusItem:[null, null],
        liveTool: "none",
        zoomMultiplier: 2,
        isMagnifying: false,
        isFullscreen: true,
        isAddingLines: false,
        colorList: ["black","lime","magenta","white","#A64129"],
        colorThisTime: "#A64129",
        currentFolio: 0,
        currentAnnoListID: 0,
        nextColumnToRemove: null,
        dereferencedLists : [],
        parsing: false,
        linebreakString : "<br>",
        brokenText : [""],
        currentManuscriptID: -1,
        imgTopSizeRatio : 1, //This is used specifically for resizing the window to help the parsing interface.
        imgTopPositionRatio: 1,
        imgBottomPositionRatio:1,
        originalCanvasHeight : 1000, //The canvas height when initially loaded into the transcription interface.
        originalCanvasWidth: 1 //The canvas width when initially loaded into the transcrtiption interface.
    },
    user: {
        isAdmin: false,
        UID: 0,
        fname: "",
        lname: "",
        openID : 0,
        authorizedManuscripts: []
    }
};
var dragHelper = "<div id='dragHelper'></div>";
var typingTimer;

/**
 * Redraw the screen for use after updating the current line, folio, or
 * tools being used. Expects all screen variables to be set.
 *
 * @return {undefined}
*/
function redraw() {
    tpen.screen.focusItem = [null, null];
    var canvas = tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio];
    if (tpen.screen.currentFolio > - 1) {
        if (tpen.screen.liveTool === "parsing") {
            $(".pageTurnCover").show();
            //fullPage();
            tpen.screen.currentFolio = parseInt(tpen.screen.currentFolio);
            if (!canvas) {
                canvas = tpen.manifest.sequences[0].canvases[0];
                console.warn("Folio was not found in Manifest. Loading first page...");
            }
            loadTranscriptionCanvas(canvas, "parsing");
            setTimeout(function () {
            hideWorkspaceForParsing();
                $(".pageTurnCover").fadeOut(1500);
            }, 800);
        }
        else {
            if (!canvas) {
                canvas = tpen.manifest.sequences[0].canvases[0];
                console.warn("Folio was not found in Manifest. Loading first page...");
            }
            loadTranscriptionCanvas(canvas, "");
        }
    } else {
    // failed to draw, no Canvas selected
    }
    scrubNav();
}

function scrubNav(){
    if(!tpen.manifest.sequences
    || !tpen.manifest.sequences[0]
    || !tpen.manifest.sequences[0].canvases){
        return false;
    }
    if(tpen.screen.currentFolio === 0){
        $("#prevCanvas,#prevPage").css("visibility","hidden");
    } else {
        $("#prevCanvas,#prevPage").css("visibility","");
    }
    if (tpen.screen.currentFolio >= tpen.manifest.sequences[0].canvases.length - 1) {
        $("#nextCanvas,#nextPage").css("visibility","hidden");
    } else {
        $("#nextCanvas,#nextPage").css("visibility","");
    }
}

/* Load the interface to the first page of the manifest. */
function firstFolio () {
    Data.saveTranscription(""); //Are we sure we need this here?  It should already be updated and saved....
    tpen.screen.currentFolio = 0;
    redraw("");
}

/* Load the interface to the last page of the manifest. */
function lastFolio(){
    Data.saveTranscription(""); //Are we sure we need this here?  It should already be updated and saved....
    tpen.screen.currentFolio = tpen.manifest.sequences[0].canvases.length - 1;
    redraw("");
}
/* Load the interface to the previous page from the one you are on. */
function previousFolio (parsing) {
    if (tpen.screen.currentFolio === 0) {
        throw new Error("You are already on the first page.");
    }
    //Data.saveTranscription(); //Are we sure we need this here?  It should already be updated and saved....
    tpen.screen.currentFolio--;
    redraw("");
}

/* Load the interface to the next page from the one you are on. */
function nextFolio (parsing) {
    if (tpen.screen.currentFolio >= tpen.manifest.sequences[0].canvases.length - 1) {
        throw new Error("That page is beyond the last page.");
    }
    //Data.saveTranscription(); //Are we sure we need this here?  It should already be updated and saved....
    tpen.screen.currentFolio++;
    redraw("");
}

/** Test if a given string can be parsed into a valid JSON object.
 * @param str  A string
 * @return bool
*/
function isJSON(str) {
    if (typeof str === "object") {
        return true;
    }
    else {
        try {
            JSON.parse(str);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    return false;
};

/* Populate the split page for Text Preview.  These are the transcription lines' text. */
function createPreviewPages(){
    $(".previewPage").remove();
        var pageLabel = "";
        var transcriptionFolios = tpen.manifest.sequences[0].canvases;
        for (var i = 0; i < transcriptionFolios.length; i++) {
            var currentFolioToUse = transcriptionFolios[i];
            pageLabel = currentFolioToUse.label;
            var currentPage = "";
            if (i === tpen.screen.currentFolio) {
                currentPage = "currentPage";
            }
            if (currentFolioToUse.otherContent && currentFolioToUse.otherContent.length > 0){
                var listOfAnnos = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
                //var allAnnoLists = currentFolioToUse.otherContent;
                //for(var j=0; j<allAnnoLists.length; j++){
                    //var thisList = allAnnoLists[j];
                makePreviewPage(listOfAnnos, pageLabel, currentPage, i, 0, listOfAnnos.length);
                //}
            }
            else{
                console.warn("otherContent was null or empty, passing an empty array of lines");
                populatePreview([], pageLabel, currentPage, 0);
            }
        }

}

function makePreviewPage(thisList, pageLabel, currentPage, i, j, l){
    var listOfAnnos = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
    populatePreview(listOfAnnos, pageLabel, currentPage, i);
//    if(data.proj == tpen.project.id){
//        var linesForThisProject = data.resources;
//        populatePreview(linesForThisProject, pageLabel, currentPage, i);
//    }
//    else if(j == l){ //we did not find the proper annotation list, send this off to create an empty page
//        populatePreview(linesForThisProject, pageLabel, currentPage, i);
//    }

}

/* Gather the annotations for a canvas and populate the preview interface with them. */
function gatherAndPopulate(currentOn, pageLabel, currentPage, i){
    var annosURL = "getAnno";
    var properties = {"@type": "sc:AnnotationList", "on" : currentOn};
    var paramOBJ = {"content": JSON.stringify(properties)};
    $.post(annosURL, paramOBJ, function(annoList){
        annoList = JSON.parse(annoList);
    });
}

/* Populate the line preview interface. */
function populatePreview(lines, pageLabel, currentPage, order){
    var isCurrent =(tpen.screen.currentFolio===order);
    var letterIndex = 0;
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var previewPage = $('<div order="' + order + '" class="previewPage" data-pagenumber="' + pageLabel + '"></div>');
    if (lines.length === 0) {
        previewPage.text("No Lines");
    }
    var num = 0;
    //TODO: specificially find the xml tags and wrap them in a <span class='xmlPreview'> so that the UI can make a button to toggle the highlight on and off.
    for (var j = 0; j < lines.length; j++){
        num++;
        var col = letters[letterIndex];
        var currentLine = lines[j].on;
        var currentLineXYWH = currentLine.slice(currentLine.indexOf("#xywh=") + 6);
        currentLineXYWH = currentLineXYWH.split(",");
        var currentLineX = currentLineXYWH[0];
        var line = lines[j];
        var lineID = line["@id"];
        var rawLineText = line.resource["cnt:chars"];
        rawLineText = $("<div/>").text(rawLineText).html();
        var lineText = highlightTags(rawLineText);
//        console.log("Did the tags highlight?");
//        console.log(lineText);
        if (j >= 1){
            var lastLine = lines[j - 1].on;
            var lastLineXYWH = lastLine.slice(lastLine.indexOf("#xywh=") + 6);
            lastLineXYWH = lastLineXYWH.split(",");
            var lastLineX = lastLineXYWH[0];
            var abs = Math.abs(parseInt(lastLineX) - parseInt(currentLineX));
            if (abs > 0){
                letterIndex++;
                num = 0;
            }
        }
        var previewLine = $('<div class="previewLine" data-lineNumber="' + j + '">'
            + '<span class="previewLineNumber" lineserverid="' + lineID + '" data-lineNumber="' + j + '"  data-column="' + col + '"  data-lineOfColumn="' + j + '">'
            + col + '' + num + '</span>'
            + '<span class="previewText" >' + lineText + '<span class="previewLinebreak"></span></span></div>');
//            + '<span class="previewNotes" contentEditable="true" ></span></div>');
        if(isCurrent){
            previewLine.find(".previewText").addClass("currentPage").attr("contenteditable",true);
        }
        previewPage.append(previewLine);
    }
    $("#previewDiv").append(previewPage);
}

/*
 * Takes a line of transcription text and wraps the xml tags in a <span> element.  Returns the new string with the span elements.
 * This is to enable toggling highlight on XML tags on and off in the preview split page area.
 * @param {type} transLineText
 * @returns {undefined}
 */
function highlightTags(workingText){
    var encodedText = [workingText];
    if (workingText.indexOf("&gt;")>-1){
        var open = workingText.indexOf("&lt;");
        var beginTags = new Array();
        var endTags = new Array();
        var i = 0;
        while (open > -1){
            beginTags[i] = open;
            var close = workingText.indexOf("&gt;",beginTags[i]);
            if (close > -1){
                endTags[i] = (close+4);
            }
            else {
                beginTags[0] = null;
                break;
            }
            open = workingText.indexOf("&lt;",endTags[i]);
            i++;
        }
        //use endTags because it might be 1 shorter than beginTags
        var oeLen = endTags.length;
        encodedText = [workingText.substring(0, beginTags[0])];
        for (i=0;i<oeLen;i++){
            encodedText.push("<span class='previewTag'>",
            workingText.substring(beginTags[i], endTags[i]),
            "</span>");
            if (i!=oeLen-1){
                encodedText.push(workingText.substring(endTags[i], beginTags[i+1]));
            }
        }
        if(oeLen>0)encodedText.push(workingText.substring(endTags[oeLen-1]));
    }
    return encodedText.join("");
}

function populateSpecialCharacters(specialCharacters){
    var specialCharacters = tpen.project.specialChars;
    var speCharactersInOrder = new Array(specialCharacters.length);
    for (var char = 0; char < specialCharacters.length; char++){
        var thisChar = specialCharacters[char];
        if (thisChar == ""){ }
        else {
            var keyVal = thisChar.key;
            var position2 = parseInt(thisChar.position);
            var newCharacter = "<div class='character lookLikeButtons' onclick='addchar(\"&#" + keyVal + "\")'>&#" + keyVal + ";</div>";
            if (position2 - 1 >= 0 && (position2 - 1) < specialCharacters.length) {
                speCharactersInOrder[position2 - 1] = newCharacter;
            }
        }
    }
    for (var char2 = 0; char2 < speCharactersInOrder.length; char2++){
        var textButton = speCharactersInOrder[char2];
        var button1 = $(textButton);
        $(".specialCharacters").append(button1);
    }
}

function populateXML(){
    var xmlTags = tpen.project.xml;
    var tagsInOrder = [];
    for (var tagIndex = 0; tagIndex < xmlTags.length; tagIndex++){
        var newTagBtn = "";
        var tagName = xmlTags[tagIndex].tag;
        if(tagName && tagName!== "" && tagName !== " "){
            var fullTag = "";
            var xmlTagObject = xmlTags[tagIndex];
            var parametersArray = xmlTagObject.parameters; //This is a string array of properties, paramater1-parameter5 out of the db.
            if (parametersArray[0] != null) {
                fullTag += " " + parametersArray[0];
            }
            if (parametersArray[1] != null) {
               fullTag += " " + parametersArray[1];
            }
            if (parametersArray[2] != null) {
               fullTag += " " + parametersArray[2];
            }
            if (parametersArray[3] != null) {
               fullTag += " " + parametersArray[3];
            }
            if (parametersArray[4] != null) {
               fullTag += " " + parametersArray[4];
            }
            if(fullTag !== ""){
                fullTag = "<"+tagName+" "+fullTag+">";
            }
            var description = xmlTagObject.description;
            newTagBtn = "<div onclick=\"insertAtCursor('" + tagName + "', '', '" + fullTag + "',false);\" class='xmlTag lookLikeButtons' title='" + fullTag + "'>" + description + "</div>"; //onclick=\"insertAtCursor('" + tagName + "', '', '" + fullTag + "');\">
            var button = $(newTagBtn);
            $(".xmlTags").append(button);
        }
    }
}

function setTPENObjectData(data){
    if(data.project){
        if(data.projectTool){
            tpen.project.tools = JSON.parse(data.projectTool);
        }
        if(data.userTool){
            tpen.project.userTools = JSON.parse(data.userTool);
        }
        if(data.ls_u){
            tpen.project.user_list = JSON.parse(data.ls_u);
        }
        if(data.ls_leader){
            tpen.project.leaders = JSON.parse(data.ls_leader);
        }
        if(data.projectButtons){
            tpen.project.specialChars = JSON.parse(data.projectButtons);
        }
        if(data.ls_hk){
            tpen.project.hotkeys = JSON.parse(data.ls_hk);
        }
        if(data.xml){
            tpen.project.xml = JSON.parse(data.xml);
        }
        if(data.projper){
            tpen.project.permissions = JSON.parse(data.projper);
        }
        if(data.metadata){
            tpen.project.metadata = JSON.parse(data.metadata);
        }
        if(data.ls_fs){
            tpen.project.folios = JSON.parse(data.ls_fs);
        }
        if(data.projectName){
            tpen.project.projectName = data.projectName;
        }
        if(data.project.projectID){
            tpen.project.id = parseInt(data.project.projectID);
        }
        if(data.project.groupID){
            tpen.project.groupID = parseInt(data.project.groupID);
        }
        if(data.project.linebreakSymbol){
            tpen.project.linebreakSymbol = data.project.linebreakSymbol;
        }
        if(data.project.projectImageBounding){
            tpen.project.projectImageBounding = data.project.projectImageBounding;
        }
        if(data.project.linebreakCharacterLimit){
            tpen.project.linebreakCharacterLimit = parseInt(data.project.linebreakCharacterLimit);
        }

    if(data.remainingText){
        tpen.project.remainingText = data.remainingText;
    }
        // update the uploadLocation for linebreaking tool
        var uploadLocation = "uploadText.jsp?p="+tpen.project.folios[tpen.screen.currentFolio || 0].folioNumber
            +"&projectID="+tpen.project.id;
        $("#uploadText").add("#newText").attr("href",uploadLocation);
        $("#lbText").html(unescape(tpen.project.remainingText));
        $("#linebreakTextContainer").show();
        $("#linebreakNoTextContainer").hide();
    }

    if(data.manifest){
        tpen.manifest = JSON.parse(data.manifest);
    }

    if(data.cuser){
        tpen.user.UID = parseInt(data.cuser);
    }

    if(data.user_mans_auth){
        tpen.user.authorizedManuscripts = JSON.parse(data.user_mans_auth);
    }

    var count = 0;
    var length = tpen.project.leaders.length;
    $.each(tpen.project.leaders, function(){
        count++;
        if (this.UID === parseInt(data.cuser)){
            if(this.fname){
                tpen.user.fname = this.fname;
            }
            if(this.lname){
                tpen.user.lname = this.lname;
            }
            if(this.openID){
                tpen.user.openID = this.openID;
            }
            tpen.user.isAdmin = true;
            //tpen.user.UID = parseInt(this.UID);
        }
        else if(count == length){ //we did not find this user in the list of leaders.
            console.warn("Not an admin");
        }
    });
}

/*
* Load the transcription from the text in the text area.
* This is the first thing called when coming into
* transcription.html when it recognizes a projectID in the URL.
*/
function loadTranscription(pid, tool){
    //Object validation here.
    var projectID = 0;
    var userTranscription = $('#transcriptionText').val();
    var pageToLoad = getURLVariable("p");
    var canvasIndex = 0;

    $("#transTemplateLoading").show();
    if (pid || $.isNumeric(userTranscription)){
        //The user can put the project ID in directly and a call will be made to newberry proper to grab it.
        projectID = pid || userTranscription;
        tpen.project.id = projectID; //this must be set or the canvas won't draw
        updateURL("");
        var url = "getProjectTPENServlet?projectID=" + projectID;
        $.ajax({
            url: url,
            type:"GET",
            success: function(activeProject){
                var url = "";
                if(!activeProject.manifest) {
                    $(".turnMsg").html("Sorry! We had trouble fetching this project.  Refresh the page to try again.");
                    $(".transLoader").find("img").attr("src", "../TPEN28/images/BrokenBook01.jpg");
                    return false;
                }
                setTPENObjectData(activeProject);
                activateUserTools(tpen.project.userTools, tpen.project.permissions);
                if (tpen.manifest.sequences[0] !== undefined
                    && tpen.manifest.sequences[0].canvases !== undefined
                    && tpen.manifest.sequences[0].canvases.length > 0)
                {
                    transcriptionFolios = tpen.manifest.sequences[0].canvases;
                    if(pageToLoad){
                        $.each(tpen.project.folios, function(i){
                            if(this.folioNumber === parseInt(pageToLoad)){
                                canvasIndex = i;
                                tpen.screen.currentFolio = i;
                                return true;
                            }
                        });
                    }
                    scrubFolios();
                    $.each(transcriptionFolios, function(count){
                        var label = (tpen.screen.currentFolio===count) ?
                        "‣" + this.label : "&nbsp;" + this.label;
                        var opt = $("<option folioNum='" + count
                            + "' val='" + this.label + "'>"
                            + label + "</option>");
                        $("#pageJump").append(opt.clone().addClass("folioJump")); // add page indicator... (tpen.screen.currentFolio===count && "‣") is false
                        $("#compareJump").append(opt.addClass("compareJump"));
                        if (this.otherContent){
                            if (this.otherContent.length > 0){
                                // all's well
                            }
                            else {
                            //otherContent was empty (IIIF says otherContent should
                            //have URI's to AnnotationLists).  We will check the
                            //store for these lists still.
                            }
                        }
                        else {
                            // no list at all, let's create a spot
                            this.otherContent = [];
                        }
                    });
                    loadTranscriptionCanvas(transcriptionFolios[canvasIndex], "", tool);
                    var projectTitle = tpen.manifest.label;
                    $("#trimTitle").text(projectTitle);
                    $("#trimTitle").attr("title", projectTitle);
                    $('#transcriptionTemplate').css("display", "inline-block");
                    $('#setTranscriptionObjectArea').hide();
                    $(".instructions").hide();
                    $(".hideme").hide();
                    //load Iframes after user check and project information data call
                    loadIframes();
                }
                else {
                    throw new Error("This transcription object is malformed. No canvas sequence is defined.");
                }
                $.each(tpen.project.userTools, function(index,tool){
                    var label;
                    switch(tool){
                        case "abbreviation" : label = "Cappelli Abbreviations";
                            break;
                        case "compare" : label = "Compare Pages";
                            break;
                        case "parsing" : label = false;
                            break;
                        case "preview" : label = "Preview Transcription";
                            break;
                        case "history" : label = "Line History";
                            break;
                        case "linebreak" : label = "Import Text";
                            break;
                        case "paleography" : label = false;
                            break;
                    }
                    var splitToolSelector = $('<option splitter="' + tool
                        + '" class="splitTool">' + label + '</option>');
                    if(label){
                        $("#splitScreenTools").append(splitToolSelector);
                    }
                });
                $.each(tpen.project.tools, function(){
                    var splitHeight = window.innerHeight + "px";
                    var toolLabel = this.name;
                    var toolSource = this.url;
                    var splitTool = $('<div toolName="' + toolLabel
                        + '" class="split iTool"><div class="fullScreenTrans"><i class="fa fa-reply"></i>'
                        + 'Full Screen Transcription</div></div>');
                    var splitToolIframe = $('<iframe style="height:' + splitHeight
                        + ';" src="' + toolSource + '"></iframe>');
                    var splitToolSelector = $('<option splitter="' + toolLabel
                        + '" class="splitTool">' + toolLabel + '</option>');
                    splitTool.append(splitToolIframe);
                    $("#splitScreenTools")
                    .append(splitToolSelector);
                    $(".iTool:last")
                    .after(splitTool);
                });
                if (tpen.project.specialChars) {
                    populateSpecialCharacters();
                }
                if (tpen.project.xml) {
                    populateXML();
                }
                if(tpen.project.folios.length > 0){
                    $.get("tagTracker",{
                        listTags    : true,
                        folio    : tpen.project.folios[canvasIndex].folioNumber,
                        projectID   : projectID
                    }, function(tags){
                        if (tags !== undefined) {
                            buildClosingTags(tags.split("\n"));
                        }
                    });
                }
            },
            error: function(jqXHR, error, errorThrown) {
                if (jqXHR.status && jqXHR.status === 404){
                   $(".turnMsg").html("Could not find this project.  Check the project ID. Refresh the page to try again or contact your T-PEN admin.");
                   $(".transLoader").find("img").attr("src", "../TPEN28/images/missingImage.png");
                }
                else {
                    $(".turnMsg").html("This project appears to be broken.  Refresh the page to try to load it again or contact your T-PEN admin.");
                    $(".transLoader").find("img").attr("src", "../TPEN28/images/BrokenBook01.jpg");
                }

                //load Iframes after user check and project information data call
                loadIframes();
            }
        });

    }
    else if (isJSON(userTranscription)){
        tpen.manifest = userTranscription = JSON.parse(userTranscription);
        if (userTranscription.sequences[0] !== undefined
            && userTranscription.sequences[0].canvases !== undefined
            && userTranscription.sequences[0].canvases.length > 0)
        {
            var transcriptionFolios = userTranscription.sequences[0].canvases;
            scrubFolios();
            var count = 1;
            $.each(transcriptionFolios, function(){
                $("#pageJump").append("<option folioNum='" + count
                    + "' class='folioJump' val='" + this.label + "'>"
                    + this.label + "</option>");
                $("#compareJump").append("<option class='compareJump' folioNum='"
                    + count + "' val='" + this.label + "'>"
                    + this.label + "</option>");
                count++;
                if (this.otherContent){
                    if (this.otherContent.length > 0){
                        // all's well
                    }
                    else {
                        //otherContent was empty (IIIF says otherContent should
                        //have URI's to AnnotationLists).  We will check the
                        //store for these lists still.
                    }
                }
                else {
                    // no property at all, create one for storing new annotations
                    this.otherContent=[];
                }
            });
            loadTranscriptionCanvas(transcriptionFolios[canvasIndex], "", tool);
            var projectTitle = userTranscription.label;
            $("#trimTitle").html(projectTitle);
            $("#trimTitle").attr("title", projectTitle);
            $('#transcriptionTemplate').css("display", "inline-block");
            $('#setTranscriptionObjectArea').hide();
            $(".instructions").hide();
            $(".hideme").hide();
        }
        else {
            throw new Error("This is a valid JSON object, but it cannot be read as a transcription object.");
        }
        //load Iframes after user check and project information data call
        loadIframes();
    }
    else if (userTranscription.indexOf("http://") >= 0 || userTranscription.indexOf("https://") >= 0) {
        //TODO: allow users to include the p variable and load a page?
        var localProject = false;
        if (userTranscription.indexOf("/TPEN28/project") > - 1 || userTranscription.indexOf("/TPEN28/manifest") > - 1){
            localProject = true;
            if(userTranscription.indexOf("/TPEN28/project") > - 1){
                projectID = parseInt(userTranscription.substring(userTranscription.lastIndexOf('/project/') + 9));
            }
            else if(userTranscription.indexOf("/TPEN28/manifest") > - 1){
                projectID = parseInt(userTranscription.substring(userTranscription.lastIndexOf('/manifest/') + 10).replace("/manifest.json", ""));
            }

           // }
        }
        else {
            projectID = 0;
        }

        if (localProject){
            //get project info first, get manifest out of it, populate
            updateURL("");
            var url = "getProjectTPENServlet?projectID=" + projectID;
            $.ajax({
                url: url,
                type:"GET",
                success: function(activeProject){
                    tpen.project.id = projectID; //this must be set or the canvas won't draw
                    setTPENObjectData(activeProject);
                    var userToolsAvailable = activeProject.userTool;
                    var projectPermissions = JSON.parse(activeProject.projper);
                    activateUserTools(tpen.project.userTools, tpen.project.permissions);
                    if (tpen.manifest.sequences[0] !== undefined
                        && tpen.manifest.sequences[0].canvases !== undefined
                        && tpen.manifest.sequences[0].canvases.length > 0)
                    {
                        transcriptionFolios = tpen.manifest.sequences[0].canvases;
                        //Could allow them to load a specific page with a local project URL.
//                        if(pageToLoad){
//                            $.each(tpen.project.folios, function(i){
//                                if(this == pageToLoad){
//                                    canvasIndex = i;
//                                }
//                            });
//                        }
                        scrubFolios();
                        var count = 1;
                        $.each(transcriptionFolios, function(){
                            $("#pageJump").append("<option folioNum='" + count
                                + "' class='folioJump' val='" + this.label + "'>"
                                + this.label + "</option>");
                            $("#compareJump").append("<option class='compareJump' folioNum='"
                                + count + "' val='" + this.label + "'>"
                                + this.label + "</option>");
                            count++;
                            if (this.otherContent){
                                if (this.otherContent.length > 0){
                                    // all's well
                                }
                                else {
                                //otherContent was empty (IIIF says otherContent should
                                //have URI's to AnnotationLists).  We will check the
                                //store for these lists still.
                                }
                            }
                            else {
                                // no list at all, let's create a spot
                                this.otherContent = [];
                            }
                        });
                        loadTranscriptionCanvas(transcriptionFolios[canvasIndex], "", tool);
                        var projectTitle = tpen.manifest.label;
                        $("#trimTitle").text(projectTitle);
                        $("#trimTitle").attr("title", projectTitle);
                        $('#transcriptionTemplate').css("display", "inline-block");
                        $('#setTranscriptionObjectArea').hide();
                        $(".instructions").hide();
                        $(".hideme").hide();
                        //load Iframes after user check and project information data call
                        loadIframes();
                    }
                    else {
                        throw new Error("This transcription object is malformed. No canvas sequence is defined.");
                    }
                    if(tpen.project.tools){
                        $.each(tpen.project.tools, function(){
                            var splitHeight = window.innerHeight + "px";
                            var toolLabel = this.name;
                            var toolSource = this.url;
                            var splitTool = $('<div toolName="' + toolLabel
                                + '" class="split iTool"><div class="fullScreenTrans"><i class="fa fa-reply"></i>'
                                + 'Full Screen Transcription</div></div>');
                            var splitToolIframe = $('<iframe style="height:' + splitHeight
                                + ';" src="' + toolSource + '"></iframe>');
                            var splitToolSelector = $('<option splitter="' + toolLabel
                                + '" class="splitTool">' + toolLabel + '</option>');
                            splitTool.append(splitToolIframe);
                            $("#splitScreenTools")
                                .append(splitToolSelector);
                            $(".iTool:last")
                                .after(splitTool);
                        });
                        }
                        if (tpen.project.specialChars) {
                            populateSpecialCharacters();
                        }
                        if (tpen.project.xml) {
                            populateXML();
                        }
                },
                error: function(jqXHR, error, errorThrown) {
                    if (jqXHR.status && jqXHR.status === 404){
                        $(".turnMsg").html("Could not find this project.  Check the project ID.  Refresh the page to try again or contact your T-PEN admin.");
                        $(".transLoader").find("img").attr("src", "..TPEN28/images/missingImage.png");
                     }
                     else {
                         $(".turnMsg").html("This project appears to be broken.  Refresh the page to try to load it again or contact your T-PEN admin.");
                         $(".transLoader").find("img").attr("src", "..TPEN28/images/BrokenBook01.jpg");
                     }
                    //load Iframes after user check and project information data call
                    loadIframes();
                }
            });
            //Build in the XML tag reminders for this project.
            $.get("tagTracker",{
                    listTags    : true,
                    folio    : tpen.project.folios[canvasIndex].folioNumber,
                    projectID   : projectID
                }, function(tags){
                if (tags !== undefined) {
                    buildClosingTags(tags.split("\n"));
                }
            });
        }
        else {
        //it is not a local project, so just grab the url that was input and request the manifest.
        var url = userTranscription;
        tpen.project.id = -1; //This means it is not a T-PEN projec5t, but rather a manifest from another source.
        $.ajax({
            url: url,
            success: function(projectData){
                if (projectData.sequences[0] !== undefined
                    && projectData.sequences[0].canvases !== undefined
                    && projectData.sequences[0].canvases.length > 0){
                    transcriptionFolios = projectData.sequences[0].canvases;
                    scrubFolios();
                    var count = 1;
                    $.each(transcriptionFolios, function(){
                        $("#pageJump").append("<option folioNum='" + count
                            + "' class='folioJump' val='" + this.label + "'>"
                            + this.label + "</option>");
                        $("#compareJump").append("<option class='compareJump' folioNum='"
                            + count + "' val='" + this.label + "'>"
                            + this.label + "</option>");
                        count++;
                        if (this.otherContent){
                            if (this.otherContent.length > 0){
                                // all's well
                            }
                            else {
                                //otherContent was empty (IIIF says otherContent
                                //should have URI's to AnnotationLists).
                                console.warn("`otherContent` exists, but has no content.");
                            }
                        }
                        else {
                            console.warn("`otherContent` does not exist in this Manifest.");
                        }
                    });
                    loadTranscriptionCanvas(transcriptionFolios[canvasIndex], "", tool);
                    var projectTitle = projectData.label;
                    $("#trimTitle").html(projectTitle);
                    $("#trimTitle").attr("title", projectTitle); $('#transcriptionTemplate').css("display", "inline-block");
                    $('#setTranscriptionObjectArea').hide();
                    $(".instructions").hide();
                    $(".hideme").hide();
                }
                else {
                    throw new Error("Malformed transcription object. There is no canvas sequence defined.");
                }
                //load Iframes after user check and project information data call
                loadIframes();
            },
            error: function(jqXHR, error, errorThrown) {
                if (jqXHR.status && jqXHR.status > 400){
                    alert(jqXHR.responseText);
                }
                else {
                    throw error;
                }
                //load Iframes after user check and project information data call
                loadIframes();
            }
        });
    }
    }
    else {
        throw new Error("The input was invalid.");
    }
    scrubNav();

}

function activateTool(tool){
	// TODO: Include other tools here.
    if(tool === "parsing"){
        if(tpen.user.isAdmin || tpen.permissions.allow_public_modify || tpen.permissions.allow_public_modify_line_parsing){
            $("#parsingBtn").click();
            tpen.screen.liveTool = "parsing";
        }
    }
}

/*
 *
 * @param {type} tools
 * Looks at the array of user tools available passed in as project data and makes those options visible.
 *
 */
function activateUserTools(tools, permissions){
    var placeholderSplit = function(name,msg){
        $('body').append('<div id="'+name+'Split" class="split">'
            +'<div class="fullScreenTrans"><i class="fa fa-share fa-flip-vertical"></i> Close Tool</div>'
            +'<p>'+msg+'</p>'
            +'</div>');
        // $('#'+name+"Split").show();
    };
    if((tpen.user.isAdmin || permissions.allow_public_modify || permissions.allow_public_modify_line_parsing) && $.inArray("parsing", tools) > -1 ){
        $("#parsingBtn").show();
        //tpen.user.isAdmin = true; // QUESTION: #169 Why isAdmin if you can parse? ANSWER:  Old code problem.  This has been taken out and tested.
        var message = $('<span>This canvas has no lines. If you would like to create lines</span>'
            + '<span style="color: blue;" onclick="hideWorkspaceForParsing()">click here</span>.'
            + 'Otherwise, you can <span style="color: red;" onclick="$(\'#noLineWarning\').hide()">'
            + 'dismiss this message</span>.');
        $("#noLineConfirmation").empty();
        $("#noLineConfirmation").append(message);
    }
    // This is all sort of moot, since they are being built regardless at this point.
    //    if($.inArray("linebreak", tools) > -1){
    //        $("#linebreakSplit").show();
    //    }
    //    if($.inArray("history", tools) > -1){
    //        // No history tool on page #114
    //        placeholderSplit('history', "No tool available, ticket #114");
    //    }
    //    if($.inArray("preview", tools) > -1){
    //        $("#previewSplit").show();
    //    }
    //    if($.inArray("abbreviation", tools) > -1){
    //        // No abbreviation tool or endpoint available #170
    //        placeholderSplit('abbrev', "No tool available, ticket #170");
    //    }
    //    if($.inArray("compare", tools) > -1){
    //        $("#compareSplit").show();
    //    }
        if($.inArray("page", tools) > -1){
            $("#canvasControls").show();
        }
        if($.inArray("xml", tools) > -1){
            $("#toggleXML").show();
        }
        if($.inArray("characters", tools) > -1){
            $("#toggleChars").show();
        }
        if($.inArray("inspector", tools) > -1){
            $("#magnify1").show();
        }
}

/*
 * Checks the TPEN object for the manuscript permissions from a specific folio.  If this user has not accepted the
 * agreement, then they will see a pop up requiring them to request access.
 * @param {type} id
 * @returns {Boolean}
 * */
function checkManuscriptPermissions(id){
    var permitted = false;
    var manID = -1;
    for(var i=0; i<tpen.project.folios.length; i++){
        if(id == tpen.project.folios[i].folioNumber){
            manID = tpen.project.folios[i].manuscript;
            tpen.screen.currentManuscriptID = manID;
            $("input[name='ms']").val(manID);
            $("input[name='projectID']").val(tpen.project.id);
            for(var j=0; j< tpen.user.authorizedManuscripts.length; j++){
                if(parseInt(tpen.user.authorizedManuscripts[j].manID) === manID){
                    if(tpen.user.authorizedManuscripts[j].auth === "true"){
                        permitted = true;
                    }
                    if(tpen.user.authorizedManuscripts[j].controller){
                        $(".manController").attr("title", "The controlling user is "+tpen.user.authorizedManuscripts[j].controller);
                    }
                    break;
                }
            }
        }
    }
    return permitted;
}

/* Hit the API to record this user has accepted the IPR agreement.  */
function acceptIPR(folio){
    var url = "acceptIPR";
    var paramObj = {user:tpen.user.UID, folio:folio};
    var params = {"content":JSON.stringify(paramObj)};
    $.post(url, params)
    .success(function(data){
        $("#iprAccept").fadeOut(1500);
        $(".trexHead").fadeOut(1500);
    });
}

/*
 * Checks the TPEN object for the IPR agreement from a specific folio.  If this user has not accepted the
 * agreement, then they will see a pop up requiring them to request access.
 * @param {type} id
 * @returns {Boolean}
 * */
function checkIPRagreement(id){
    var agreed = false;
    for(var i=0; i<tpen.project.folios.length; i++){
        if(id == tpen.project.folios[i].folioNumber){
            agreed = tpen.project.folios[i].ipr;
            $("#ipr_who").html(tpen.project.folios[i].archive);
            $("#iprAgreement").html(tpen.project.folios[i].ipr_agreement);
            $("#accept_ipr").attr("onclick", "acceptIPR("+id+")");
            //$("#ipr_user") is set in transcription.html
            break;
        }
    }
    return agreed;
}

/*
 * Load a canvas from the manifest to the transcription interface.
 */
function loadTranscriptionCanvas(canvasObj, parsing, tool){
    var noLines = true;
    var canvasAnnoList = "";
    var canvasURI = canvasObj["@id"];
    var lastslashindex = canvasURI.lastIndexOf('/');
    var folioID= canvasURI.substring(lastslashindex  + 1).replace(".png","");
    var permissionForImage = checkManuscriptPermissions(folioID);
    var ipr_agreement = checkIPRagreement(folioID);
    $("#imgTop, #imgBottom").css("height", "400px");
    $("#imgTop img, #imgBottom img").css("height", "400px");
    $("#imgTop img, #imgBottom img").css("width", "auto");
    $("#prevColLine").html("**");
    $("#currentColLine").html("**");
    $('.transcriptionImage').attr('src', "images/loading2.gif"); //background loader if there is a hang time waiting for image
    $('.lineColIndicator').remove();
    $(".transcriptlet").remove();
    var pageTitle = canvasObj.label;
    $("#trimPage").html(pageTitle);
    $("#trimPage").attr("title", pageTitle);
    $('#transcriptionTemplate').css("display", "inline-block");
    $("#parsingBtn").css("box-shadow", "none");
    $("#parsingButton").removeAttr('disabled');
    //Move up all image annos
    var cnt = - 1;
    if (canvasObj.images[0].resource['@id'] !== undefined
        && canvasObj.images[0].resource['@id'] !== ""){ //Only one image
        var image = new Image();
        $(image)
        .on("load", function() {
            $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
            $("#imgTop img, #imgBottom img").css("width", "100%");
            $("#imgBottom").css("height", "inherit");
            if(permissionForImage){
                $('.transcriptionImage').attr('src', canvasObj.images[0].resource['@id'].replace('amp;', ''));
                $("#fullPageImg").attr("src", canvasObj.images[0].resource['@id'].replace('amp;', ''));
                populateCompareSplit(tpen.screen.currentFolio);
                //FIXME At some point I had to track tpen.screen.originalCanvasHeight differently.  Not sure that
                //I need to anymore, test making these tpen.screen.* and see what happens.
                originalCanvasHeight2 = $("#imgTop img").height();
                originalCanvasWidth2 = $("#imgTop img").width();
                tpen.screen.originalCanvasHeight = $("#imgTop img").height();
                tpen.screen.originalCanvasWidth =  $("#imgTop img").width();
                drawLinesToCanvas(canvasObj, parsing, tool);
                $("#transcriptionCanvas").attr("canvasid", canvasObj["@id"]);
                $("#transcriptionCanvas").attr("annoList", canvasAnnoList);
                $("#parseOptions").find(".tpenButton").removeAttr("disabled");
                $("#parsingBtn").removeAttr("disabled");
                tpen.screen.textSize();
                if(!ipr_agreement){
                    $('#iprAccept').show();
                    $(".trexHead").show();
                }
            }
            else{
                $('#requestAccessContainer').show();
                $(".trexHead").show();
                //handle the background
                var image2 = new Image();
                $(image2)
                .on("load", function(){
                    $("#noLineWarning").hide();
                    $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
                    $("#imgTop img, #imgBottom img").css("width", "100%");
                    $('.transcriptionImage').attr('src', "images/missingImage.png");
                    $("#fullPageImg").attr("src", "images/missingImage.png");
                    $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
                    $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
                    $("#imgTop").css("height", "0%");
                    $("#imgBottom img").css("top", "0px");
                    $("#imgBottom").css("height", "inherit");
                    $("#parsingButton").attr("disabled", "disabled");
                    $("#parseOptions").find(".tpenButton").attr("disabled", "disabled");
                    $("#parsingBtn").attr("disabled", "disabled");
                    $("#transTemplateLoading").hide();
                })
                .attr("src", "images/missingImage.png");
            }

        })
        .on("error", function(){
            var image2 = new Image();
            $(image2)
            .on("load", function(){
                $("#noLineWarning").hide();
                $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
                $("#imgTop img, #imgBottom img").css("width", "100%");
                $('.transcriptionImage').attr('src', "images/missingImage.png");
                $("#fullPageImg").attr("src", "images/missingImage.png");
                $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
                $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
                $("#imgTop").css("height", "0%");
                $("#imgBottom img").css("top", "0px");
                $("#imgBottom").css("height", "inherit");
                $("#parsingButton").attr("disabled", "disabled");
                alert("No image for this canvas or it could not be resolved.  Not drawing lines.");
                $("#parseOptions").find(".tpenButton").attr("disabled", "disabled");
                $("#parsingBtn").attr("disabled", "disabled");
                $("#transTemplateLoading").hide();
            })
            .attr("src", "images/missingImage.png");
        })
        .attr("src", canvasObj.images[0].resource['@id'].replace('amp;', ''));
    }
    else {
        $('.transcriptionImage').attr('src', "images/missingImage.png");
        throw Error("The canvas is malformed.  No 'images' field in canvas object or images:[0]['@id'] does not exist.  Cannot draw lines.");
    }
    createPreviewPages(); //each time you load a canvas to the screen with all of its updates, remake the preview pages.
}

/*
 * @paran canvasObj  A canvas object to extract transcription lines from and draw to the interface.
 * @param parsing boolean if parsing is live tool
 */
function drawLinesToCanvas (canvasObj, parsing, tool) {
    var lines = [];
    var currentFolio = parseInt(tpen.screen.currentFolio);
    if (canvasObj.resources !== undefined
        && canvasObj.resources.length > 0) {
        for (var i = 0; i < canvasObj.resources.length; i++) {
            if (isJSON(canvasObj.resources[i])) {   // it is directly an annotation
                lines.push(canvasObj.resources[i]);
            }
        }
        linesToScreen(lines, tool);
    }
    else {
        // we have the anno list for this canvas (potentially), so query for it.
        // If not found, then consider this an empty canvas.
        var annosURL = "getAnno";
        var onValue = canvasObj["@id"];
        var properties = {
            "@type": "sc:AnnotationList", "on": onValue, proj: tpen.project.id
        };
        var paramOBJ = {
            "content": JSON.stringify(properties)
        };
        if ($.type(canvasObj.otherContent) === "string") {
            $.post(annosURL, paramOBJ, function (annoList) {
                if (!tpen.manifest.sequences[0].canvases[currentFolio]) {
                    throw new Error("Missing canvas:" + currentFolio);
                }
                if (!tpen.manifest.sequences[0].canvases[currentFolio].otherContent) {
                    tpen.manifest.sequences[0].canvases[currentFolio].otherContent = new Array();
                }
                //FIXME: The line below throws a JSON error sometimes, especially on first load.
                var annoList = tpen.manifest.sequences[0].canvases[currentFolio].otherContent = tpen.manifest.sequences[0].canvases[currentFolio].otherContent.concat(JSON.parse(annoList));
                var currentList = {};
            updateURL("p");
                if (annoList.length > 0) {
                    // Scrub resolved lists that are already present.
                    //tpen.screen.currentAnnoListID = annoList[0]; //There should always just be one that matches because of proj, default to first in array if more
                    lines = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], true, parsing, tool);
                }
                else {
                    // couldnt get list.  one should always exist, even if empty.
                    // We will say no list and changes will be stored locally to the canvas.
                    if (parsing !== "parsing") {
                        $("#noLineWarning")
                            .show();
                    }
                    $("#transTemplateLoading")
                        .hide();
                    $("#transcriptionTemplate")
                        .show();
                    $('#transcriptionCanvas')
                        .css('height', $("#imgTop img")
                            .height() + "px");
                    $('.lineColIndicatorArea')
                        .css('height', $("#imgTop img")
                            .height() + "px");
                    $("#imgTop")
                        .css("height", "0%");
                    $("#imgBottom img")
                        .css("top", "0px");
                    $("#imgBottom")
                        .css("height", "inherit");
                    $("#parsingBtn")
                        .css("box-shadow", "0px 0px 6px 5px yellow");
                }
            });
        } else if (canvasObj.otherContent && canvasObj.otherContent[0] && canvasObj.otherContent[0].resources) {
            tpen.screen.dereferencedLists[tpen.screen.currentFolio] = tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[0];
            drawLinesOnCanvas(canvasObj.otherContent[0].resources, parsing, tool);
        }
    }
    tpen.screen.textSize();
}
function updateURL(piece){
    var toAddressBar = document.location.href;
    //If nothing is passed in, just ensure the projectID is there.
    console.log("does URL contain projectID?        "+getURLVariable("projectID"));
    if(!getURLVariable("projectID")){
        toAddressBar = "?projectID="+tpen.project.id;
    }
    //Any other variable will need to be replaced with its new value
    if(piece === "p"){
        if(!getURLVariable("p")){
            console.log("Gotta add P var");
            toAddressBar += "&p=" + tpen.project.folios[tpen.screen.currentFolio].folioNumber;
        }
        else{
            console.log("Gotta update P var");
            toAddressBar = replaceURLVariable("p", tpen.project.folios[tpen.screen.currentFolio].folioNumber);
        }
    }
    console.log("push this into history and URL");
    console.log(toAddressBar);
    window.history.pushState("", "T-PEN Transcription", toAddressBar);
}
/* Take line data, turn it into HTML elements and put them to the DOM */
function linesToScreen(lines, tool){
    $("#noLineWarning").hide();
    var letterIndex = 0;
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    letters = letters.split("");
    var update = true;
    if ($("#parsingDiv").is(":visible")){
        update = false; // TODO: Is this just a tpen.screen.liveTool check?
    }
    var thisContent = "";
    var thisNote = "";
    var thisPlaceholder = "Enter a line transcription";
    var counter = -1;
    var colCounter = 0;
    var image = $('#imgTop img');
    var theHeight = image.height();
    var theWidth = image.width();
    $('#transcriptionCanvas').css('height', originalCanvasHeight2 + "px");
    $('.lineColIndicatorArea').css('height', originalCanvasHeight2 + "px");
    //can i use tpen.screen.originalCanvasHeight here?
    var ratio = 0;
    //should be the same as originalCanvasWidth2/originalCanvasHeight2
    ratio = theWidth / theHeight;
    for (var i = 0; i < lines.length; i++){
        var line = lines[i];
        var lastLine = {};
        var col = letters[letterIndex];
        if (i > 0)lastLine = lines[i - 1];
        var lastLineX = 10000;
        var lastLineWidth = - 1;
        var lastLineTop = - 2;
        var lastLineHeight = - 2;
        var x, y, w, h = 0;
        var XYWHarray = [x, y, w, h];
        var lineURL = "";
        var lineID = - 1;
        if (line.on !== undefined){
            lineURL = line.on;
        }
        else {
            //ERROR.  malformed line.
            update = false;
        }
        if (line["@id"] !== undefined && line["@id"] !== ""){
            lineID = line['@id'];
        }
        else {
            //undereferencable line.
            lineID = line.tpen_line_id;
        }
        thisContent = "";
        if (lineURL.indexOf('#') > - 1){ //string must contain this to be valid
            var XYWHsubstring = lineURL.substring(lineURL.lastIndexOf('#' + 1)); //xywh = 'x,y,w,h'
            if (lastLine.on){ //won't be true for first line
                var xywh = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")
                lastLineX = xywh[0];
                lastLineWidth = xywh[2];
                lastLineTop = xywh[1];
                lastLineHeight = xywh[3];
            }
            else if (i === 0 && lines.length > 1){ // Check for the variance with the first line
                lastLine = lines[0];
                if (lastLine.on){
                    lastLineX = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[0];
                    lastLineWidth = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[2];
                    lastLineTop = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[1];
                    lastLineHeight = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[3];
                }
            }
            if (XYWHsubstring.indexOf('xywh=') > - 1){ //string must contain this to be valid
                var numberArray = XYWHsubstring.substring(lineURL.lastIndexOf('xywh=') + 5).split(',');
                if (parseInt(lastLineTop) + parseInt(lastLineHeight) !== numberArray[1]){
                //check for slight variance in top position.  Happens because of rounding percentage math that gets pixels to be an integer.
                    var num1 = parseInt(lastLineTop) + parseInt(lastLineHeight);
                    if (Math.abs(num1 - numberArray[1]) <= 4 && Math.abs(num1 - numberArray[1]) !== 0){
                        numberArray[1] = num1;
                        var newString = numberArray[0] + "," + num1 + "," + numberArray[2] + "," + numberArray[3];
                        if (i > 0){
                        //to make the change cascade to the rest of the lines,
                        // we actually have to update the #xywh of the current
                        // line with the new value for y.
                            var lineOn = lineURL;
                            var index = lineOn.indexOf("#xywh=") + 6;
                            var newLineOn = lineOn.substr(0, index) + newString + lineOn.substr(index + newString.length);
                            lines[i].on = newLineOn;
                        }
                    }
                }
                if (numberArray.length === 4){ // string must have all 4 to be valid
                    x = numberArray[0];
                    w = numberArray[2];
                    if (lastLineX !== x){
                        //check if the last line's x value is equal to this
                        // line's x value (means same column)
                        if (Math.abs(x - lastLineX) <= 3){
                            //allow a 3 pixel  variance and fix this variance when necessary...
                        //align them, call them the same Column.
                /*
                 * This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its integer position off of
                 * percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
                 * for here.  There may be better ways of handling this, but this is a good solution for now.
                 */
                            if (lastLineWidth !== w){ //within "same" column (based on 3px variance).  Check the width
                                if (Math.abs(w - lastLineWidth) <= 5){
                                    // If the width of the line is within five pixels,
                                    // automatically make the width equal to the last line's width.

                                    //align them, call them the same Column.
                            /*
                             * This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its intger position off of
                             * percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
                             * for here.  There may be better ways of handling this, but this is a good solution for now.
                             */
                                    w = lastLineWidth;
                                        numberArray[2] = w;
                                }
                            }
                            x = lastLineX;
                            numberArray[0] = x;
                        }
                        else { //we are in a new column, column indicator needs to increase.
                            letterIndex++;
                            col = letters[letterIndex];
                            colCounter = 0; //Reset line counter so that when the column changes the line# restarts
                        }
                    }
                    else {
                        // X value matches, we are in the same column and don't
                        // have to account for any variance or update the array.
                        // Still check for slight width variance..
                        if (lastLineWidth !== w){
                            if (Math.abs(w - lastLineWidth) <= 5){ //within 5 pixels...
                                //align them, call them the same Column.
                                /* This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its intger position off of
* percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
* for here.  There may be better ways of handling this, but this is a good solution for now. */
                                w = lastLineWidth;
                                numberArray[2] = w;
                            }
                        }
                    }
                    y = numberArray[1];
                    h = numberArray[3];
                    XYWHarray = [x, y, w, h];
                }
                else {
                    //ERROR! Malformed line
                    update = false;
                }
            }
            else {
                //ERROR! Malformed line
                update = false;
            }
        }
        else {
            //ERROR!  Malformed line.
            update = false;
        }
        if (line.resource['cnt:chars'] !== undefined
            && line.resource['cnt:chars'] !== "") {
            thisContent = line.resource['cnt:chars'];
        }
        if(line._tpen_note !== undefined){
            thisNote = line._tpen_note;
        }
        counter++;
        var htmlSafeText = $("<div/>").text(thisContent).html();
        var htmlSafeText2 = $("<div/>").text(thisNote).html();
        var newAnno = $('<div id="transcriptlet_' + counter + '" col="' + col
            + '" colLineNum="' + colCounter + '" lineID="' + counter
            + '" lineserverid="' + lineID + '" class="transcriptlet" data-answer="'
            + escape(thisContent) + '"><textarea class="theText" placeholder="' + thisPlaceholder + '">'
            + htmlSafeText + '</textarea><textarea class="notes" data-answer="'+escape(thisNote)+'" placeholder="Line notes">'
            + htmlSafeText2 + '</textarea></div>');
        // 1000 is promised, 10 goes to %
        var left = parseFloat(XYWHarray[0]) / (10 * ratio);
        var top = parseFloat(XYWHarray[1]) / 10;
        var width = parseFloat(XYWHarray[2]) / (10 * ratio);
        var height = parseFloat(XYWHarray[3]) / 10;
        newAnno.attr({
            lineLeft: left,
                lineTop: top,
                lineWidth: width,
                lineHeight: height,
                counter: counter
        });
        colCounter++;
        //$("#transcriptletArea").append(newAnno);
        $(".xmlClosingTags").before(newAnno);
        var lineColumnIndicator = $("<div onclick='loadTranscriptlet(" + counter + ");' pair='" + col + "" + colCounter
            + "' lineserverid='" + lineID + "' lineID='" + counter + "' class='lineColIndicator' style='left:"
            + left + "%; top:" + top + "%; width:" + width + "%; height:" + height + "%;'><div class='lineColOnLine' >"
            + col + "" + colCounter + "</div></div>");
        var fullPageLineColumnIndicator = $("<div pair='" + col + "" + colCounter + "' lineserverid='" + lineID
            + "' lineID='" + counter + "' class='lineColIndicator fullP' onclick=\"updatePresentation($('#transcriptlet_" + counter + "'));\""
            + " style='left:" + left + "%; top:" + top + "%; width:" + width + "%; height:"
            + height + "%;'><div class='lineColOnLine' >" + col + "" + colCounter + "</div></div>");
        // TODO: add click event to update presentation
        // Make sure the col/line pair sits vertically in the middle of the outlined line.
        var lineHeight = theHeight * (height / 100) + "px";
        lineColumnIndicator.find('.lineColOnLine').attr("style", "line-height:" + lineHeight + ";");
        //Put to the DOM
        $(".lineColIndicatorArea").append(lineColumnIndicator);
        $("#fullPageSplitCanvas").append(fullPageLineColumnIndicator);
    }
    if (update && $(".transcriptlet").eq(0).length > 0){
        updatePresentation($(".transcriptlet").eq(0));
        activateTool(tool);
    }
    else{
        console.warn("No lines found in a bad place...");
    }
    // we want automatic updating for the lines these texareas correspond to.
    $("textarea")
        .keydown(function(e){
        //user has begun typing, clear the wait for an update
        clearTimeout(typingTimer);
    })
        .keyup(function(e){
            Preview.updateLine(this);
            var lineToUpdate = $(this).parent();
            clearTimeout(typingTimer);
            //when a user stops typing for 2 seconds, fire an update to get the new text.
            if(e.which !== 18){
                typingTimer = setTimeout(function(){
                    console.log("timer update");
                    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
                    var idToCheckFor = lineToUpdate.attr("lineserverid");
                    var newText = lineToUpdate.find(".theText").val();
                    if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
                    // if it IIIF, we need to update the list
                        $.each(currentAnnoList, function(index, data){
                            if(data["@id"] == idToCheckFor){
                                currentAnnoList[index].resource["cnt:chars"] = newText;
                                tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources = currentAnnoList;
                                updateLine(lineToUpdate, false, true);
                                return false;
                            }

                        });
                    }
                }, 2000);
            }

    });
}

/* Make the transcription interface focus to the transcriptlet passed in as the parameter. */
function updatePresentation(transcriptlet) {
    if (transcriptlet === undefined || transcriptlet === null){
        $("#imgTop").css("height", "0%");
        $("#imgBottom").css("height", "inherit");
        return false;
    }
    var nextCol = transcriptlet.attr("col");
    var nextLineNum = parseInt(transcriptlet.attr("collinenum")) + 1;
    var transcriptletBefore = $(transcriptlet.prev());
    var nextColLine = nextCol + "" + nextLineNum;
    $("#currentColLine").html(nextColLine);
    if (parseInt(nextLineNum) >= 1){
        if (transcriptletBefore.length > 0){
        var currentTranscriptletNum = parseInt(transcriptletBefore.attr("collinenum")) + 1;
            if (transcriptletBefore.length > 0){ }
            else{ }
            var prevLineCol = transcriptletBefore.attr("col");
            var prevLineText = unescape(transcriptletBefore.attr("data-answer"));
            var prevLineNote = unescape(transcriptletBefore.find(".notes").attr("data-answer"));
            $("#prevColLine").html(prevLineCol + "" + currentTranscriptletNum).css("visibility","");
            $("#captionsText").text((prevLineText.length && prevLineText) || "This line is not transcribed.").attr("title",prevLineText)
                .next().html(prevLineNote).attr("title",prevLineNote);
        }
        else { //this is a problem
            $("#prevColLine").html(prevLineCol + "" + currentTranscriptletNum).css("visibility","hidden");
            $("#captionsText").html("You are on the first line.").next().html("");
        }
    }
    else { //there is no previous line
        $("#prevColLine").html(prevLineCol + "" + currentTranscriptletNum).css("visibility","hidden");
        $("#captionsText").html("ERROR.  NUMBERS ARE OFF").next().html("");
    }
    tpen.screen.focusItem[0] = tpen.screen.focusItem[1];
    tpen.screen.focusItem[1] = transcriptlet;
    if ((tpen.screen.focusItem[0] === null)
        || (tpen.screen.focusItem[0].attr("id") !== tpen.screen.focusItem[1].attr("id"))) {
        adjustImgs(setPositions());
        swapTranscriptlet();
        // show previous line transcription
        $('#captions').css({
            opacity: 1
        });
    }
    else {
        adjustImgs(setPositions());
        tpen.screen.focusItem[1].prevAll(".transcriptlet").addClass("transcriptletBefore").removeClass("transcriptletAfter");
        tpen.screen.focusItem[1].nextAll(".transcriptlet").addClass("transcriptletAfter").removeClass("transcriptletBefore");
    }
    // prevent textareas from going invisible and not moving out of the workspace
    tpen.screen.focusItem[1].removeClass("transcriptletBefore transcriptletAfter")
        .find('.theText')[0].focus();
    // change prev/next at page edges
    if($(".transcriptletBefore").size()===0){

        $("#prevLine").hide();
        $("#prevPage").show();
    } else {
        $("#prevLine").show();
        $("#prevPage").hide();
    }
    if($(".transcriptletAfter").size()===0){
        $("#nextLine").hide();
        $("#nextPage").show();
    } else {
        $("#nextLine").show();
        $("#nextPage").hide();
    }
};

/* Helper for position focus onto a specific transcriptlet.  Makes sure workspace stays on screen. */
function setPositions() {
    // Determine size of section above workspace
    var bottomImageHeight = $("#imgBottom img").height();
    if (tpen.screen.focusItem[1].attr("lineHeight") !== null) {
        var pairForBookmarkCol = tpen.screen.focusItem[1].attr('col');
        var pairForBookmarkLine = parseInt(tpen.screen.focusItem[1].attr('collinenum'));
        pairForBookmarkLine++;
        var pairForBookmark = pairForBookmarkCol + pairForBookmarkLine;
        var currentLineHeight = parseFloat(tpen.screen.focusItem[1].attr("lineHeight"));
        var currentLineTop = parseFloat(tpen.screen.focusItem[1].attr("lineTop"));
        var previousLineTop = 0.0;
        var previousLineHeight = 0.0;
        var nextLineHeight = 0.0; //only used to gauge height of imgTop
        var imgTopHeight = 0.0; //value for the height of imgTop
        if(tpen.screen.focusItem[1].next().is('.transcriptlet')){
            nextLineHeight = parseFloat(tpen.screen.focusItem[1].next().attr("lineHeight"));
        }
        if(tpen.screen.focusItem[1].prev().is('.transcriptlet') && currentLineTop > parseFloat(tpen.screen.focusItem[1].prev().attr("lineTop"))){
            previousLineTop = parseFloat(tpen.screen.focusItem[1].prev().attr("lineTop"));
            previousLineHeight = parseFloat(tpen.screen.focusItem[1].prev().attr("lineHeight"));
        }
        else{ //there may not be a previous line so use the values of the line you are on
            previousLineTop = currentLineTop;
            previousLineHeight = currentLineHeight;
        }

        //We may be able to do this a bit better.
        if(nextLineHeight > 0.0){
            imgTopHeight = (nextLineHeight + currentLineHeight); // obscure behind workspace.
        }
        else{ //there may not be a next line so use the value of the previous line...
            imgTopHeight = (previousLineHeight + currentLineHeight) + 1.5; // obscure behind workspace.  Do we need the 1.5?
        }
        var topImgPositionPercent = ((previousLineTop - currentLineTop) * 100) / imgTopHeight;
        var topImgPositionPx = ((-currentLineTop * bottomImageHeight) / 100);
        if(topImgPositionPx <= -12){
            topImgPositionPx += 12;
        }
        var bottomImgPositionPercent = -(currentLineTop + currentLineHeight);
        var bottomImgPositionPx = -((currentLineTop + currentLineHeight) * bottomImageHeight / 100);
        if(bottomImgPositionPx <= -12){
            bottomImgPositionPx += 12;
        }
        var imgTopSize = (((imgTopHeight/100)*bottomImageHeight) / Page.height())*100;
        var percentageFixed = 0;
        //use this to make sure workspace stays on screen!
        if (imgTopSize > 80){ //if #imgTop is 80% of the screen size then we need to fix that so the workspace stays.
            var workspaceHeight = 170; //$("#transWorkspace").height();
            var origHeight = imgTopHeight;
            imgTopHeight = ((Page.height() - workspaceHeight - 80) / bottomImageHeight) *  100; //this needs to be a percentage
            percentageFixed = (100-(origHeight - imgTopHeight))/100; //what percentage of the original amount is left
            bottomImgPositionPercent *= percentageFixed; //do the same percentage change to this value
            bottomImgPositionPx *= percentageFixed; //and this one
            topImgPositionPx *= percentageFixed; // and this one

        }
    }
    var positions = {
        imgTopHeight: imgTopHeight,
        topImgPositionPercent: topImgPositionPercent,
        topImgPositionPx : topImgPositionPx,
        bottomImgPositionPercent: bottomImgPositionPercent,
        bottomImgPositionPx: bottomImgPositionPx,
        activeLine: pairForBookmark
    };
    tpen.screen.imgTopPositionRatio = positions.topImgPositionPx / bottomImageHeight;
    tpen.screen.imgBottomPositionRatio = positions.bottomImgPositionPx / bottomImageHeight;
    return positions;
}

/**
* Removes previous textarea and slides in the new focus.
*
* @see updatePresentation()
*/
function swapTranscriptlet() {
    // slide in the new transcriptlet
    tpen.screen.focusItem[1].css({"width": "auto", "z-index": "5"});
    tpen.screen.focusItem[1].removeClass("transcriptletBefore transcriptletAfter");
    tpen.screen.focusItem[1].prevAll(".transcriptlet").addClass("transcriptletBefore").removeClass("transcriptletAfter");
    tpen.screen.focusItem[1].nextAll(".transcriptlet").addClass("transcriptletAfter").removeClass("transcriptletBefore");
    if ($('.transcriptletAfter').length === 0){
        $('#nextTranscriptlet').hide();
    }
    else {
        $('#nextTranscriptlet').show();
    }
    if ($('.transcriptletBefore').length === 0){
        $('#previousTranscriptlet').hide();
    }
    else {
        $('#previousTranscriptlet').show();
    }
}
var Page = {
    /**
     *  Returns converted number to CSS consumable string rounded to n decimals.
     *
     *  @param num float unprocessed number representing an object dimension
     *  @param n number of decimal places to include in returned string
     *  @returns float in ##.## format (example shows n=2)
     */
    convertPercent: function(num,n){
        return Math.round(num*Math.pow(10,(n+2)))/Math.pow(10,n);
    },
    /**
     * Sloppy hack so .focus functions work in FireFox
     *
     * @param elem element to focus on
     */
    focusOn: function(elem){
        setTimeout("elem.focus()",0);
    },
    /**
     * Window dimensions.
     *
     * @return Integer width of visible page
     */
    width: function() {
        return window.innerWidth !== null? window.innerWidth: document.body !== null? document.body.clientWidth:null;
    },
    /**
     * Window dimensions.
     *
     * @return Integer height of visible page
     */
    height: function() {
        return window.innerHeight !== null? window.innerHeight: document.body !== null? document.body.clientHeight:null;
    }
};

/**
 * Keep workspace on the screen when displaying large lines.
 * Tests for need and then adjusts. Runs on change to
 * workspace size or line change.
 *
 * **deprecated.  @see setPositions()
 */
function maintainWorkspace(){
    // keep top img within the set proportion of the screen
    var imgTopHeight = $("#imgTop").height();
    if (imgTopHeight > Page.height()) {
        imgTopHeight = Page.height();
        //Should I try to convert this to a percentage?
        $("#imgTop").css("height", imgTopHeight);
       // adjustImgs(setPositions());
    }
    else{
    }

}
/**
 * Aligns images and workspace using defined dimensions.
 *
 * @see maintainWorkspace()
*/
function adjustImgs(positions) {
    //move background images above and below the workspace
    var lineToMakeActive = $(".lineColIndicator[pair='" + positions.activeLine + "']:first");
    var topImageHeight = $("#imgTop img").height();
    $("#imgTop")
        .css({
            "height": positions.imgTopHeight + "%"
            });
    $("#imgTop img").css({
            top: positions.topImgPositionPx + "px",
            left: "0px"
        });
    $("#imgTop .lineColIndicatorArea")
        .css({
            top: positions.topImgPositionPx + "px",
            left: "0px"
        });
    $("#imgBottom img")
        .css({
            top: positions.bottomImgPositionPx + "px",
            left: "0px"
        });
    $("#imgBottom .lineColIndicatorArea")
        .css({
            top: positions.bottomImgPositionPx + "px",
            left: "0px"
        });
    if ($('.activeLine').hasClass('linesHidden')){
        $('.activeLine').hide();
    }
    $(".lineColIndicator")
        .removeClass('activeLine')
        .css({
            "background-color":"transparent"
        });
    lineToMakeActive.addClass("activeLine");
}

/* Update the line information of the line currently focused on, then load the focus to a line that was clicked on */
function loadTranscriptlet(lineid){
    var currentLineServerID = tpen.screen.focusItem[1].attr("lineserverid");
    if ($('#transcriptlet_' + lineid).length > 0){
        if (tpen.user.UID || tpen.user.isAdmin){
            var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
            updateLine(lineToUpdate, false, true);
            updatePresentation($('#transcriptlet_' + lineid));
        }
        else {
        var captionText1 = $("#captionsText").html();
            $("#captionsText").html("You are not logged in.").next().html("");
            $('#captionsText').css("background-color", 'red');
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
            setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText1); }, 1500);
        }
    }
    else { //blink a caption warning
        var captionText = $("#captionsText").html();
        var noteText = $("#note").html();
        $("#captionsText").html("Cannot load this line.").next().html("");
        $('#captionsText').css("background-color", 'red');
        setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
        setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
        setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText).next().html(noteText); }, 1500);
    }
}

/*
             * The UI control for going the the next transcriptlet in the transcription.
             */
function nextTranscriptlet() {
    var thisLine = tpen.screen.focusItem[1].attr('lineID');
    thisLine++;
    var nextID = thisLine;
    var currentLineServerID = tpen.screen.focusItem[1].attr("lineserverid");
    if ($('#transcriptlet_' + nextID).length > 0){
        if (tpen.user.UID || tpen.user.isAdmin){
            var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
            updateLine(lineToUpdate, false, true);
            updatePresentation($('#transcriptlet_' + nextID));
        }
        else {
            var captionText1 = $("#captionsText").html();
            $("#captionsText").html("You are not logged in.");
            $('#captionsText').css("background-color", 'red');
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
            setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText1); }, 1500);
        }
    }
    else { //blink a caption warning
        var captionText = $("#captionsText").html();
        $("#captionsText").html("You are on the last line! ").next().html("");
        $('#captionsText').css("background-color", 'red');
        setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
        setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
        setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText); }, 1500);
    }
}

/*
             * The UI control for going the the previous transcriptlet in the transcription.
             */
function previousTranscriptlet() {
    var prevID = parseFloat(tpen.screen.focusItem[1].attr('lineID')) - 1;
    var currentLineServerID = tpen.screen.focusItem[1].attr("lineserverid");
    if (prevID >= 0){
        if (tpen.user.UID || tpen.user.isAdmin){
            var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
            updateLine(lineToUpdate, false, false);
            updatePresentation($('#transcriptlet_' + prevID));
        }
        else {
            var captionText1 = $("#captionsText").html();
            $("#captionsText").html("You are not logged in.");
            $('#captionsText').css("background-color", 'red');
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
            setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText1); }, 1500);
        }
    }
    else {
        //captions already say "You are on the first line"
    }
}

/**
 *
 * Allows workspace to be moved up and down on the screen.
 * Requires shift key to be held down.
 */
function moveWorkspace(evt){
    $("#imgTop,#imgBottom,#imgBottom img").addClass('noTransition');
    var startImgTop = $("#imgTop").height();
    var startImgBottom = $("#imgBottom img").position().top;
    var startImgBottomH = $("#imgBottom").height();
    var mousedownPosition = evt.pageY;
    evt.preventDefault();
    $(dragHelper).appendTo("body");
    $(document)
    .disableSelection()
    .mousemove(function(event){
        var imgBtmSpot = startImgBottom - (event.pageY - mousedownPosition);
        $("#imgTop").height(startImgTop + event.pageY - mousedownPosition);
        $("#imgBottom").css({
            "height": startImgBottomH - (event.pageY - mousedownPosition)
        })
        .find("img").css({
            "top"   : startImgBottom - (event.pageY - mousedownPosition)
        });
        $("#imgBottom .lineColIndicatorArea").css("top", startImgBottom - (event.pageY - mousedownPosition) + "px");
        $("#dragHelper").css({
            top :   event.pageY - 90,
            left:   event.pageX - 90
        });
    })
    .mouseup(function(){
        $("#dragHelper").remove();
        $("#imgTop,#imgBottom,#imgBottom img").removeClass('noTransition');
        $(document)
            .enableSelection()
            .unbind("mousemove");
        isUnadjusted = false;
    });
}

/* Start event listening to move the image in the transcirption interface */
function startMoveImg(){
    if ($(".transcriptlet:first").hasClass("moveImage")){
        $("#moveImage").removeClass("selected");
        $(".transcriptlet").removeClass("moveImage");
        $(".transcriptlet").children("textarea").removeAttr("disabled");
        $("#imgTop, #imgBottom").css("cursor", "default");
        $("#imgTop,#imgBottom").unbind("mousedown");
    }
    else {
        $("#moveImage").addClass("selected");
        $(".transcriptlet").addClass("moveImage");
        $(".transcriptlet").children("textarea").attr("disabled", "");
        $("#imgTop, #imgBottom").css("cursor", "url(" + "images/open_grab.png),auto");
        $("#imgTop, #imgBottom").mousedown(function(event){moveImg(event); });
    }
}

/**
* Allows manuscript image to be moved around.
* Requires shift key to be held down.
* Synchronizes movement of top and bottom images.
* Bookmark bounding box moves with top image.
* @param event Event
*/
function moveImg(event){
    tpen.screen.isMoving=true;
    var startImgPositionX = parseFloat($("#imgTop img").css("left"));
    var startImgPositionY = parseInt($("#imgTop img").css("top"));
    var startBottomImgPositionX = parseInt($("#imgBottom img").css("left"));
    var startBottomImgPositionY = parseInt($("#imgBottom img").css("top"));
    var mousedownPositionX = event.pageX;
    var mousedownPositionY = event.pageY;
    event.preventDefault();
    $(dragHelper).appendTo("body").css({
            top :   event.pageY - 90,
            left:   event.pageX - 90
        });;
    $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark").addClass('noTransition');
    $("#imgTop, #imgBottom").css("cursor", "url(images/open_grab.png),auto");
    $(document)
    .disableSelection()
    .mousemove(function(event){
        $("#dragHelper").css({
            top :   event.pageY - 90,
            left:   event.pageX - 90
        });
        $("#imgTop img").css({
            top :   startImgPositionY + event.pageY - mousedownPositionY,
            left:   startImgPositionX + event.pageX - mousedownPositionX
        });
        $("#imgTop .lineColIndicatorArea").css({
            top :   startImgPositionY + event.pageY - mousedownPositionY,
            left:   startImgPositionX + event.pageX - mousedownPositionX
        });
        $("#imgBottom img").css({
            top :   startBottomImgPositionY + event.pageY - mousedownPositionY,
            left:   startBottomImgPositionX + event.pageX - mousedownPositionX
        });
        $("#imgBottom .lineColIndicatorArea").css({
            top :   startBottomImgPositionY + event.pageY - mousedownPositionY,
            left:   startBottomImgPositionX + event.pageX - mousedownPositionX
        });
    })
    .mouseup(function(){
        $("#dragHelper").remove();
        $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark").removeClass('noTransition');
        if (!tpen.screen.isMagnifying)$("#imgTop, #imgBottom").css("cursor", "url(images/open_grab.png),auto");
        $(document)
            .enableSelection()
            .unbind("mousemove");
        tpen.screen.isMoving=false;
        isUnadjusted = false;
    })
    .keyup(function(event){
        if(!event.altKey||!(event.ctrlKey||event.metaKey)){
            tpen.screen.toggleMoveImage(false);
        }
    });
}



function magnify(img, event){
    //For separating out different imgs on which to zoom.
    var container = ""; // #id of limit
    if (img === "trans"){
        img = $("#transcriptionTemplate");
        container = "transcriptionCanvas";
        $("#magnifyTools").fadeIn(800);
        $("button[magnifyimg='trans']").addClass("selected");
    }
    else if (img === "compare"){
        img = $("#compareSplit");
        container = "compareSplit";
        $("#magnifyTools").fadeIn(800).css({
            "left":$("#compareSplit").css("left"),
            "top" : "100px"
        });
        $("button[magnifyimg='compare']").addClass("selected");
    }
    else if (img === "full"){
        img = $("#fullPageSplitCanvas");
        container = "fullPageSplit";
        $("#magnifyTools").fadeIn(800).css({
            "left":$("#fullPageSplit").css("left"),
            "top" : "100px"
        });
        $("button[magnifyimg='full']").addClass("selected");
    }
    $("#zoomDiv").show();
    $(".magnifyHelp").show();
    hideWorkspaceToSeeImage();
    $(".lineColIndicatorArea").hide();
    tpen.screen.liveTool = "image";
    mouseZoom(img,container, event);
}

function stopMagnify(){
    tpen.screen.isMagnifying = false;
    tpen.screen.zoomMultiplier = 2;
    $(document).off("mousemove");
    $("#zoomDiv").removeClass("ui-state-active");
    $("#zoomDiv").hide();
    $(".magnifyBtn").removeClass("ui-state-active");
    $("#magnifyTools").fadeOut(800);
    $(".lineColIndicatorArea").show();
    $(".magnifyHelp").hide();
    $("button[magnifyimg='full']").removeClass("selected");
    $("button[magnifyimg='compare']").removeClass("selected");
    $("button[magnifyimg='trans']").removeClass("selected");
    restoreWorkspace();
}

/**
     * Zooms in on the bounded area for a closer look.
     *
     * @param zoomOut: boolean to zoom in or out, prefer to use isZoomed
     */
    function zoomBookmark(zoomOut){
        var topImg = $("#imgTop img");
        var btmImg = $("#imgBottom img");
        var imgSrc = topImg.attr("src");
        if (imgSrc.indexOf("quality") === -1) {
            imgSrc += "&quality=100";
            topImg.add(btmImg).attr("src",imgSrc);
        }
        var WRAPWIDTH = $("#transcriptionCanvas").width();
        var workspaceHeight = $("#transWorkspace").height();
        var availableRoom = new Array (Page.height()-workspaceHeight,WRAPWIDTH);
        var bookmark = $('.activeLine');
        var limitIndex = (bookmark.width()/bookmark.height() > availableRoom[1]/availableRoom[0]) ? 1 : 0;
        var zoomRatio = (limitIndex === 1) ? availableRoom[1]/bookmark.width() : availableRoom[0]/bookmark.height();
        var imgDims = new Array (topImg.height(),topImg.width(),parseInt(topImg.css("left")),parseInt(topImg.css("top"))-bookmark.position().top);
        if (!zoomOut){
            //zoom in
            $("#bookmark").hide();
            tpen.screen.zoomMemory = [parseInt(topImg.css("top")),parseInt(btmImg.css("top"))];
            $("#imgTop").css({
                "height"    : bookmark.height() * zoomRatio + 32
            });
            topImg.css({
                "width"     : imgDims[1] * zoomRatio / WRAPWIDTH * 100 + "%",
                "left"      : -bookmark.position().left * zoomRatio,
                "top"       : imgDims[3] * zoomRatio
            });
            btmImg.css({
                "left"      : -bookmark.position().left * zoomRatio,
                "top"       : (imgDims[3]-bookmark.height()) * zoomRatio,
                "width"     : imgDims[1] * zoomRatio / WRAPWIDTH * 100 + "%"
            });
            tpen.screen.isZoomed = true;
        } else {
            //zoom out
            topImg.css({
                "width"     : "100%",
                "left"      : 0,
                "top"       : tpen.screen.zoomMemory[0]
            });
            btmImg.css({
                "width"     : "100%",
                "left"      : 0,
                "top"       : tpen.screen.zoomMemory[1]
            });
            $("#imgTop").css({
                "height"    : imgTopHeight
            });
            tpen.screen.isZoomed = false;
        }
    }

/**
* Creates a zoom on the image beneath the mouse.
*
* @param $img jQuery img element to zoom on
* @param event Event
*/
function mouseZoom($img,container, event){
    tpen.screen.isMagnifying = true;
    var contain = $("#"+container).position();
    var imgURL = $img.find("img:first").attr("src");
    var page = $("#transcriptionTemplate");
    //collect information about the img
    var imgDims = new Array($img.offset().left, $img.offset().top, $img.width(), $img.height());
    //build the zoomed div
    var zoomSize = (page.height() / 3 < 120) ? 120 : page.height() / 3;
    if(zoomSize > 400) zoomSize = 400;
    var zoomPos = new Array(event.pageX, event.pageY);
    $("#zoomDiv").css({
        "box-shadow"    : "2px 2px 5px black,15px 15px " + zoomSize / 3 + "px rgba(230,255,255,.8) inset,-15px -15px " + zoomSize / 3 + "px rgba(0,0,15,.4) inset",
        "width"         : zoomSize,
        "height"        : zoomSize,
        "left"          : zoomPos[0] + 3,
        "top"           : zoomPos[1] + 3 - $(document).scrollTop() - $(".magnifyBtn").offset().top,
        "background-position" : "0px 0px",
        "background-size"     : imgDims[2] * tpen.screen.zoomMultiplier + "px",
        "background-image"    : "url('" + imgURL + "')"
    });
    $(document).on({
        mousemove: function(event){
            if (tpen.screen.liveTool !== "image" && tpen.screen.liveTool !== "compare") {
                $(document).off("mousemove");
                $("#zoomDiv").hide();
            }
            var mouseAt = new Array(event.pageX, event.pageY);
            if ( mouseAt[0] < contain.left
                || mouseAt[0] > contain.left+$("#"+container).width()
                || mouseAt[1] < contain.top
                || mouseAt[1] > contain.top+$("#"+container).height()){
                return false; // drop out, you've left containment
            }
            var zoomPos = new Array(mouseAt[0] - zoomSize / 2, mouseAt[1] - zoomSize / 2);
            var imgPos = new Array((imgDims[0] - mouseAt[0]) * tpen.screen.zoomMultiplier + zoomSize / 2 - 3, (imgDims[1] - mouseAt[1]) * tpen.screen.zoomMultiplier + zoomSize / 2 - 3); //3px border adjustment
            $("#zoomDiv").css({
                "left"  : zoomPos[0],
                "top"   : zoomPos[1] - $(document).scrollTop(),
                "background-size"     : imgDims[2] * tpen.screen.zoomMultiplier + "px",
                "background-position" : imgPos[0] + "px " + imgPos[1] + "px"
            });
        }
    }, $img);
}

tpen.screen.toggleMoveImage = function (event) {
    if (event && event.altKey && (event.ctrlKey || event.metaKey)) {
        $(".lineColIndicatorArea").hide();
        fullTopImage();
        $("#imgTop")
            .mousedown(moveImg);
    } else {
        updatePresentation(tpen.screen.focusItem[1]);
        $(".lineColIndicatorArea").show();
        $("#imgTop, #imgBottom").css("cursor", "");
    }
};

function removeTransition(){
    // TODO: objectify this
    $("#imgTop img").css("-webkit-transition", "");
    $("#imgTop img").css("-moz-transition", "");
    $("#imgTop img").css("-o-transition", "");
    $("#imgTop img").css("transition", "");
    $("#imgBottom img").css("-webkit-transition", "");
    $("#imgBottom img").css("-moz-transition", "");
    $("#imgBottom img").css("-o-transition", "");
    $("#imgBottom img").css("transition", "");
    $("#imgTop").css("-webkit-transition", "");
    $("#imgTop").css("-moz-transition", "");
    $("#imgTop").css("-o-transition", "");
    $("#imgTop").css("transition", "");
    $("#imgBottom").css("-webkit-transition", "");
    $("#imgBottom").css("-moz-transition", "");
    $("#imgBottom").css("-o-transition", "");
    $("#imgBottom").css("transition", "");
};

function restoreTransition(){
    // TODO: objectify this
    $("#imgTop img").css("-webkit-transition", "left .5s, top .5s, width .5s");
    $("#imgTop img").css("-moz-transition", "left .5s, top .5s, width .5s");
    $("#imgTop img").css("-o-transition", "left .5s, top .5s, width .5s");
    $("#imgTop img").css("transition", "left .5s, top .5s, width .5s");
    $("#imgBottom img").css("-webkit-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom img").css("-moz-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom img").css("-o-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom img").css("transition", "left .5s, top .5s, width .5s");
    $("#imgTop").css("-webkit-transition", "left .5s, top .5s, width .5s");
    $("#imgTop").css("-moz-transition", "left .5s, top .5s, width .5s");
    $("#imgTop").css("-o-transition", "left .5s, top .5s, width .5s");
    $("#imgTop").css("transition", "left .5s, top .5s, width .5s");
    $("#imgBottom").css("-webkit-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom").css("-moz-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom").css("-o-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom").css("transition", "left .5s, top .5s, width .5s");
};

/**
* Sets screen for parsing tool use.
* Slides the workspace down and scales the top img
* to full height. From here, we need to load to interface
* for the selected tool.
*/
function hideWorkspaceForParsing(){
    tpen.screen.liveTool = "parsing";
    $("#parsingBtn").css("box-shadow: none;");
    //    tpen.screen.originalCanvasHeight = $("#transcriptionCanvas").height(); //make sure these are set correctly
//    tpen.screen.originalCanvasWidth = $("#transcriptionCanvas").width(); //make sure these are set correctly
    imgTopOriginalTop = $("#imgTop img").css("top");
    $("#transcriptionTemplate").css("max-width", "57%").css("width", "57%");
    $("#transcriptionCanvas").css("max-height", window.innerHeight + "px");
    $("#transcriptionTemplate").css("max-height", window.innerHeight + "px");
    $("#controlsSplit").hide();
    var ratio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
    var newCanvasWidth = tpen.screen.originalCanvasWidth * .55;
    var newCanvasHeight = 1 / ratio * newCanvasWidth;
    var PAGEHEIGHT = Page.height();
    if (newCanvasHeight > PAGEHEIGHT){
        newCanvasHeight = PAGEHEIGHT;
        newCanvasWidth = 1/ratio*newCanvasHeight;
    }
    $("#transcriptionCanvas").css("height", newCanvasHeight);
    //$("#transcriptionCanvas").css("width", newCanvasWidth);

    $("#prevCanvas").attr("onclick", "");
    $("#nextCanvas").attr("onclick", "");
    $("#imgTop").addClass("fixingParsing");
    var topImg = $("#imgTop img");

    $("#tools").children("[id$='Split']").hide();
    $("#parsingSplit")
    .css({
        "display": "inline-block",
        "height": window.innerHeight + "px"
    })
    .fadeIn();

    topImg.css({
        "top":"0px",
        "left":"0px",
        "height":newCanvasHeight+"px",
        "overflow":"auto"
    });
    $("#imgTop .lineColIndicatorArea").css({
        "top":"0px",
        "left":"0px",
        "height":newCanvasHeight+"px"
    });

    $("#transcriptionCanvas").css("width", topImg.width());

    //the width and max-width here may need to be played with a bit.
    if ($("#trascriptionTemplate").hasClass("ui-resizable")){
        $("#transcriptionTemplate").resizable('destroy');
    }
    $("#transcriptionTemplate").resizable({
        disabled:false,
        minWidth: window.innerWidth / 2,
        maxWidth: window.innerWidth * .55,
        start: function(event, ui){
            detachWindowResize();
        },
        resize: function(event, ui) {
            console.log("resize 1");
            var width = ui.size.width;
            var height = 1 / ratio * width;
            newCanvasWidth = 1/ratio*height;
            if (height > PAGEHEIGHT){
                height = PAGEHEIGHT;
                newCanvasWidth = 1/ratio*height;
            }
//            console.log(originalCanvasHeight, originalCanvasWidth, height, newCanvasWidth, originalRatio );
            //$(".lineColIndicatorArea").css("height", height + "px");
            var splitWidth = Page.width() - (width + 35) + "px";
            $(".split img").css("max-width", splitWidth);
            $(".split:visible").css("width", splitWidth);
            $("#transcriptionCanvas").css("height", height + "px");//.css("width", newCanvasWidth + "px")
            $("#imgTop img").css({
                'height': height + "px",
                'top': "0px"
//                'width' : $("#imgTop img").width()
            });
            $("#imgTop").css({ //This width will not change when the area is expanded, but does when it is shrunk.  We need to do the math to grow it.
                'height': $("#imgTop img").height(),
                'width': tpen.screen.imgTopSizeRatio * $("#imgTop img").height() + "px" //This locks up and does not change.
            });
            tpen.screen.textSize();
        },
        stop: function(event, ui){
            attachWindowResize();
            //$(".lineColIndicator .lineColOnLine").css("line-height", $(this).height()+"px");
        }
    });
    $("#transWorkspace,#imgBottom").hide();
    $("#noLineWarning").hide();
    window.setTimeout(function(){
        $("#imgTop img").css("width", "auto");
        $("#imgTop img").css("top", "0px");
        $("#imgTop").css("width", $("#imgTop img").width());
        $("#transcriptionCanvas").css("width", $("#imgTop img").width() + "px"); //fits canvas to image.
        $("#transcriptionTemplate").css("width", "55%"); //fits canvas to image. $("#imgTop img").width() + "px".  Do we need a background color?
        $("#imgTop").css("height", $("#imgTop img").height());
        $("#transcriptionCanvas").css("display", "block");
        tpen.screen.imgTopSizeRatio = $("#imgTop img").width() / $("#imgTop img").height();
        $("#templateResizeBar").show();
    }, 500);
    window.setTimeout(function(){
        //in here we can control what interface loads up.  writeLines
        //draws lines onto the new full size transcription image.
        $('.lineColIndicatorArea').hide();
        writeLines($("#imgTop img"));
    }, 1200);
}

/**
 * Overlays divs for each parsed line onto img indicated.
 * Divs receive different classes in different
 *
 * @param imgToParse img element lines will be represented over
 */
function writeLines(imgToParse){
    $(".line,.parsing,.adjustable,.parsingColumn").remove();
    //clear and old lines to put in updated ones
    var originalX = (imgToParse.width() / imgToParse.height()) * 1000;
    var setOfLines = [];
    var count = 0;
    $(".transcriptlet").each(function(index){
        count++;
        setOfLines[index] = makeOverlayDiv($(this), originalX, count);
    });
    imgToParse.parent().append($(setOfLines.join("")));
}

function makeOverlayDiv(thisLine, originalX, cnt){
    var Y = parseFloat(thisLine.attr("lineTop"));
    var X = parseFloat(thisLine.attr("lineLeft"));
    var H = parseFloat(thisLine.attr("lineHeight"));
    var W = parseFloat(thisLine.attr("lineWidth"));
    var newY = (Y);
    var newX = (X);
    var newH = (H);
    var newW = (W);
    var lineOverlay = "<div class='parsing' linenum='" + cnt + "' style='top:"
        + newY + "%;left:" + newX + "%;height:"
        + newH + "%;width:" + newW + "%;' lineserverid='"
        + thisLine.attr('lineserverid') + "'linetop='"
        + Y + "'lineleft='" + X + "'lineheight='"
        + H + "'linewidth='" + W + "'></div>";
    return lineOverlay;
}

function restoreWorkspace(){
    $("#imgBottom").show();
    $("#imgTop").show();
    $("#imgTop").removeClass("fixingParsing");
    $("#transWorkspace").show();
    $("#imgTop").css("width", "100%");
    $("#imgTop img").css({"height":"auto", "width":"100%"});
    updatePresentation(tpen.screen.focusItem[1]);
    $(".hideMe").show();
    $(".showMe2").hide();
//    var pageJumpIcons = $("#pageJump").parent().find("i");
//    pageJumpIcons[0].setAttribute('onclick', 'firstFolio();');
//    pageJumpIcons[1].setAttribute('onclick', 'previousFolio();');
//    pageJumpIcons[2].setAttribute('onclick', 'nextFolio();');
//    pageJumpIcons[3].setAttribute('onclick', 'lastFolio();');
    $("#prevCanvas").attr("onclick", "previousFolio();");
    $("#nextCanvas").attr("onclick", "nextFolio();");
    $("#pageJump").removeAttr("disabled");
}

function hideWorkspaceToSeeImage(){
    $("#transWorkspace").hide();
    $("#imgTop").hide();
    $("#imgBottom img").css({
        "top" :"0%",
        "left":"0%"
    });
    $("#imgBottom .lineColIndicatorArea").css({
        "top": "0%"
    });
    $(".hideMe").hide();
    $(".showMe2").show();
}
function fullTopImage(){
    $("#imgTop").css("height","100vh");
    $(".hideMe").hide();
    $(".showMe2").show();
}

/* Reset the interface to the full screen transcription view. */
function fullPage(){
    if ($("#overlay").is(":visible")) {
        $("#overlay").click();
        return false;
    }
    $(".line, .parsing, .adjustable,.parsingColumn").remove();
    tpen.screen.isUnadjusted = tpen.screen.isFullscreen = true;
    if ($("#trascriptionTemplate").hasClass("ui-resizable")){
        $("#transcriptionTemplate").resizable('destroy');
    }
    $("#splitScreenTools").removeAttr("disabled");
    $("#splitScreenTools").find('option:eq(0)').prop("selected", true);
    $("#transcriptionCanvas").css("width", "100%");
    $("#transcriptionCanvas").css("height", "auto"); //Need a real height here, it can't be auto.  It needs to be the height of the image.
    $("#transcriptionCanvas").css("max-height", "none"); //Need a real height here, it can't be auto.  It needs to be the height of the image.
    $("#transcriptionTemplate").css("width", "100%");
    $("#transcriptionTemplate").css("max-width", "100%");
    $("#transcriptionTemplate").css("max-height", "none");
    $("#transcriptionTemplate").css("height", "auto");
    $("#transcriptionTemplate").css("display", "inline-block");
    $('.lineColIndicatorArea').css("max-height","none");
    $('.lineColIndicatorArea').show();
    $("#help").css({"left":"100%"}).fadeOut(1000);
    $("#fullScreenBtn").fadeOut(250);
    tpen.screen.isZoomed = false;
    $(".split").hide();
    $(".split").css("width", "43%");
    restoreWorkspace();
    $("#splitScreenTools").show();
    var screenWidth = $(window).width();
    var adjustedHeightForFullscreen = (tpen.screen.originalCanvasHeight / tpen.screen.originalCanvasWidth) * screenWidth;
    $("#transcriptionCanvas").css("height", tpen.screen.originalCanvasHeight + "px");
    $(".lineColIndicatorArea").css("height", tpen.screen.originalCanvasHeight + "px");
    var lineColor = tpen.screen.colorThisTime.replace(".4", ".9");
//     $("#imgTop").hover(
//        function(){
//             $('.activeLine').css('box-shadow', '0px 0px 15px 8px '+lineColor);
//         },
//         function(){
//             var lineColor2 = lineColor.replace(".9", ".4");
//             $('.activeLine').css('box-shadow', '0px 0px 15px 8px '+lineColor2);
//         }
//     );

//     $("#imgBottom").hover(
//         function(){
//             $('.activeLine').css('box-shadow', '0px 0px 15px 8px '+lineColor);
//         },
//         function(){
//             var lineColor2 = lineColor.replace(".9", ".4");
//             $('.activeLine').css('box-shadow', '0px 0px 15px 8px '+lineColor2);
//         }
//     );

    $.each($(".lineColOnLine"), function(){
        $(this).css("line-height", $(this).height() + "px");
    });
    if (tpen.screen.focusItem[0] == null
        && tpen.screen.focusItem[1] == null){
        updatePresentation($("#transcriptlet_0"));
    }
     //FIXME: If there is no delay here, it does not draw correctly.  Should not use setTimeout.
    if(tpen.screen.liveTool === "parsing"){
        $("#transcriptionTemplate").hide();
        $("#transTemplateLoading").show();
        setTimeout(function(){
            redraw("");
        }, 1000);
    }
    tpen.screen.liveTool = "none";

}

function splitPage(event, tool) {
    tpen.screen.liveTool = tool;
    var resize = true;
    var newCanvasWidth = tpen.screen.originalCanvasWidth * .55;
    $("#transcriptionTemplate").css({
        "width"   :   "55%",
        "display" : "inline-table"
    });
    $("#templateResizeBar").show();
    if(tool==="controls"){
        console.log("Do not attach resizable from splitPage");
        $("#transcriptionCanvas").css("width", Page.width()-200 + "px");
        $("#transcriptionTemplate").css("width", Page.width()-200 + "px");
        newCanvasWidth = Page.width()-200;
        $("#controlsSplit").show();
        resize = false; //interupts parsing resizing funcitonaliy, dont need to resize for this anyway.
    }
    var ratio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
    $("#splitScreenTools").attr("disabled", "disabled");
    var newCanvasHeight = 1 / ratio * newCanvasWidth;
    if(tool)
    $("#transcriptionCanvas").css({
        "width"   :   newCanvasWidth + "px",
        "height"   :   newCanvasHeight + "px"
    });
    var newImgBtmTop = tpen.screen.imgBottomPositionRatio * newCanvasHeight;
    var newImgTopTop = tpen.screen.imgTopPositionRatio * newCanvasHeight;
    //$(".lineColIndicatorArea").css("max-height", newCanvasHeight + "px");
    $(".lineColIndicatorArea").css("height", newCanvasHeight + "px");
    $("#imgBottom img").css("top", newImgBtmTop + "px");
    $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
    $("#imgTop img").css("top", newImgTopTop + "px");
    $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
    var originalRatio = ratio;
    $.each($(".lineColOnLine"), function(){$(this).css("line-height", $(this).height() + "px"); });
    if(resize){
        $("#transcriptionTemplate").resizable({
            disabled:false,
            minWidth: window.innerWidth / 2,
            maxWidth: window.innerWidth * .75,
            start: function(event, ui){
                detachWindowResize();
            },
            resize: function(event, ui) {
                console.log("resize 2");
                var width = ui.size.width;
                var height = 1 / originalRatio * width;
                $("#transcriptionCanvas").css("height", height + "px").css("width", width + "px");
                $(".lineColIndicatorArea").css("height", height + "px");
                var splitWidth = window.innerWidth - (width + 35) + "px";
                $(".split img").css("max-width", splitWidth);
                $(".split:visible").css("width", splitWidth);
                var newHeight1 = parseFloat($("#fullPageImg").height()) + parseFloat($("#fullPageSplit .toolLinks").height());
                var newHeight2 = parseFloat($(".compareImage").height()) + parseFloat($("#compareSplit .toolLinks").height());
                $('#fullPageSplit').css('height', newHeight1 + 'px');
                $('#compareSplit').css('height', newHeight2 + 'px');
                newImgBtmTop = tpen.screen.imgBottomPositionRatio * height;
                newImgTopTop = tpen.screen.imgTopPositionRatio * height;
                $("#imgBottom img").css("top", newImgBtmTop + "px");
                $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
                $("#imgTop img").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
            },
            stop: function(event, ui){
                attachWindowResize();
                $.each($(".lineColOnLine"), function(){
                    var height = $(this).height() + "px";
                    $(this).css("line-height", height);
                });
            }
        });
    }
    $("#fullScreenBtn")
        .fadeIn(250);
        $('.split').hide();
    //show/manipulate whichever split tool is activated.
    //This is a user added iframe tool.  tool is toolID= attribute of the tool div to show.
    var splitScreen = $("#" + tool + "Split") || $('div[toolName="' + tool + '"]');
    splitScreen.css("display", "block");
    $(".split:visible")
        .find('img')
        .css({
            'max-height': window.innherHeight + 350 + "px",
            'max-width': $(".split:visible")
                .width() + "px"
        });

}

function forceOrderPreview(){
    var ordered = [];
    var length = $(".previewPage").length;
    for (var i = 0; i < length; i++){
        var thisOne = $(".previewPage[order='" + i + "']");
        ordered.push(thisOne);
        if (i === length - 1){
            $("#previewDiv").empty();
            $("#previewDiv").append(ordered);
        }
    }
    $("#previewSplit").css({
        "display": "inline-table"
    });
}

function populateCompareSplit(folioIndex){
    var compareSrc = tpen.manifest.sequences[0].canvases[folioIndex].images[0].resource["@id"];
    var currentCompareSrc = $(".compareImage").attr("src");
    if (currentCompareSrc !== compareSrc) $(".compareImage").attr("src", compareSrc);
}

/*
 * Go through all of the parsing lines and put them into columns;
 * @see linesToColumns()
 * Global Arrray: gatheredColumns
 *
 */
function gatherColumns(startIndex){
    var colX, colY, colW, colH;
    var lastColumnLine = - 1;
    var linesInColumn = - 1;
    var hasTranscription = false;
    if ($(".parsing")[startIndex + 1]){
        var line = $(".parsing")[startIndex + 1];
        colX = parseFloat($(line).attr("lineleft"));
        colY = parseFloat($(line).attr("linetop"));
        colW = parseFloat($(line).attr("linewidth"));
        var $lastLine = $(".parsing[lineleft='" + colX + "']:last");
        colH = parseFloat($lastLine.attr("linetop")) - colY + parseFloat($lastLine.attr("lineheight"));
        var lastLineIndex = $(".parsing").index($lastLine);
        tpen.screen.gatheredColumns.push([colX, colY, colW, colH, $(line).attr("lineserverid"), $lastLine.attr("lineserverid"), true]);
        gatherColumns(lastLineIndex);
    }
}

function removeColumn(column, destroy){
    if (!destroy){
        if (column.attr("hastranscription") === "true"){
            var cfrm = confirm("This column contains transcription data that will be lost.\n\nContinue?");
            if (!cfrm) return false;
        }
    }
    var colX = column.attr("lineleft");
    // collect lines from column
    var lines = $(".parsing[lineleft='" + colX + "']");
    lines.addClass("deletable");
    tpen.screen.nextColumnToRemove = column;
    removeColumnTranscriptlets(lines, false);


}

function destroyPage(){
    tpen.screen.nextColumnToRemove = $(".parsingColumn:first");
    var colX = tpen.screen.nextColumnToRemove.attr("lineleft");
    var lines = $(".parsing[lineleft='" + colX + "']");
    if (tpen.screen.nextColumnToRemove.length > 0) {
        removeColumnTranscriptlets(lines, true);
    }
    else {
        cleanupTranscriptlets(true);
        $("#parsingCover").hide();
    }
}

/* Make parsing interface turn the lines in the view into columns */
function linesToColumns(){
//update lines in case of changes
    var gatheredColumns = tpen.screen.gatheredColumns = []; //The array built by gatherColumns()
    $(".parsingColumn").remove();
    if ($(".parsing").size() === 0) return false;
    //loop through lines to find column dimensions
    var columnParameters = new Array(); // x,y,w,h,startID,endID
    var i = 0;
    var colX, colY, colW, colH;
    var lastColumnLine = - 1;
    var linesInColumn = - 1;
    gatherColumns( - 1); //Gets all columns into an array.
    //build columns
    var columns = [];
    for (j = 0; j < gatheredColumns.length; j++){
        var parseImg = document.getElementById("imgTop").getElementsByTagName("img");
        var scaledX = gatheredColumns[j][0];
        var scaledY = gatheredColumns[j][1];
        var scaledW = gatheredColumns[j][2];
        var scaledH = gatheredColumns[j][3];
    //            // recognize, alert, and adjust to out of bounds columns
        if (scaledX + scaledW > 100){
        // exceeded the right boundary of the image
            if (scaledX > 98){
                scaledX = 98;
                scaledW = 2;
            } else {
                scaledW = 100 - scaledX - 1;
            }
        }
        if (scaledX < 0){
            // exceeded the left boundary of the image
            scaledW += scaledX;
            scaledX = 0;
        }
        if (scaledY + scaledH > 100){
            // exceeded the bottom boundary of the image
            if (scaledY > 98){
                scaledY = 98;
                scaledH = 2;
            } else {
                scaledH = 100 - scaledY - 1;
            }
        }
        if (scaledY < 0){
            // exceeded the top boundary of the image
            scaledH += scaledY;
            scaledY = 0;
        }
        var startID = $(".parsing[lineleft='" + gatheredColumns[j][0] + "']:first").attr("lineserverid");
        var endID = $(".parsing[lineleft='" + gatheredColumns[j][0] + "']:last").attr("lineserverid");
        columns.push("<div class='parsingColumn' lineleft='", gatheredColumns[j][0], "'",
            " linetop='", gatheredColumns[j][1], "'",
            " linewidth='", gatheredColumns[j][2], "'",
            " lineheight='", gatheredColumns[j][3], "'",
            " hastranscription='", gatheredColumns[j][6] == true, "'",
            " startid='", startID, "'",
            " endid='", endID, "'",
            " style='top:", scaledY, "%;left:", scaledX, "%;width:", scaledW, "%;height:", scaledH, "%;'>",
            "</div>");
    }
    //attach columns
    $(parseImg).before(columns.join(""));
    // avoid events on .lines
    $('#imgTop').find('.parsing').css({
        'z-index': '-10'
    });
    $(".parsingColumn")
    .mouseenter(function(){
        var lineInfo;
        lineInfo = $("#transcription" + ($(this).index(".parsing") + 1)).val();
        $("#lineInfo").empty()
        .text(lineInfo)
        .append("<div>" + $("#t" + ($(this).index(".line") + 1)).find(".counter").text() + "</div>")
        .show();
        if (!tpen.screen.isMagnifying){
            $(this).addClass("jumpLine");
        }
    })
    .mouseleave(function(){
        $(".parsing").removeClass("jumpLine");
        $("#lineInfo").hide();
    })
    .click(function(event){
    });
}

/**
 * Allows for column adjustment in the parsing interface.
 */
function adjustColumn(event){
    var thisColumnID = new Array(2);
    var thisColumn;
    var originalX = 1;
    var originalY = 1;
    var originalW = 1;
    var originalH = 1;
    var adjustment = "";
    var column = undefined;
    var originalPercentW;
    var originalPercentX;
    $.each($(".parsingColumn"), function(){
        if ($(this).hasClass("ui-resizable")){
            $(this).resizable("destroy");
        }
    });
    $(".parsingColumn").resizable({
        handles     : "n,s,w,e",
        containment : 'parent',
        start       : function(event, ui){
            detachWindowResize();
            $("#progress").html("Adjusting Columns - unsaved").fadeIn();
            $("#columnResizing").show();
            $("#sidebar").fadeIn();
            thisColumn = $(".ui-resizable-resizing");
            thisColumnID = [thisColumn.attr("startid"), thisColumn.attr("endid")];
            adjustment = "new";
            originalPercentW = parseFloat($(this).attr("linewidth"));
            originalPercentX = parseFloat($(this).attr("lineleft"));
        },
        resize      : function(event, ui){
            if (adjustment === "new"){
                var originalX = ui.originalPosition.left;
                var originalY = ui.originalPosition.top;
                var originalW = ui.originalSize.width;
                var originalH = ui.originalSize.height;
                var newX = ui.position.left;
                var newY = ui.position.top;
                var newW = ui.size.width;
                var newH = ui.size.height;
                var offsetForBtm = $(event.target).position().top;
                if (Math.abs(originalW - newW) > 5) adjustment = "right";
                if (Math.abs(originalH - newH) > 5) adjustment = "bottom";
                if (Math.abs(originalX - newX) > 5) adjustment = "left"; // a left change would affect w and x, order matters
                if (Math.abs(originalY - newY) > 5) adjustment = "top"; // a top change would affect h and y, order matters
                offsetForBtm = (offsetForBtm / $("#imgTop img").height()) * 100;
                newH = (newH / $("#imgTop img").height()) * 100;
                var actualBottom = newH + offsetForBtm;
                $("#progress").html("Adjusting " + adjustment + " - unsaved");
            }
        },
        stop        : function(event, ui){
            attachWindowResize();
            $("#progress").html("Column Resized - Saving...");
            var parseRatio = $("#imgTop img").width() / $("#imgTop img").height();
            var originalX = ui.originalPosition.left;
            var originalY = ui.originalPosition.top;
            var originalW = ui.originalSize.width;
            var originalH = ui.originalSize.height;
            var newX = ui.position.left;
            var newY = ui.position.top;
            var newW = ui.size.width;
            var newH = ui.size.height;
            var oldHeight, oldTop, oldLeft, newWidth, newLeft;
            //THESE ORIGINAL AND NEW VALUES ARE EVALUATED AS PIXELS, NOT PERCENTAGES
            if (adjustment === "top") {
                newY = (newY / $("#imgTop img").height()) * 100;
                originalY = (originalY / $("#imgTop img").height()) * 100;
                //save a new height for the top line;
                var startLine = $(".parsing[lineserverid='" + thisColumnID[0] + "']");
                oldHeight = parseFloat(startLine.attr("lineheight"));
                oldTop = parseFloat(startLine.attr("linetop"));
                //This should be resized right now.  If it is a good resize, the lineheight will be > 0
                startLine.attr({
                    "linetop"    : newY,
                    "lineheight" : oldHeight + oldTop - newY
                });
                startLine.css({
                    "top"    : newY + "%",
                    "height" : oldHeight + oldTop - newY + "%"
                });
                if (parseFloat(startLine.attr("lineheight")) < 0){
                    // top of the column is below the bottom of its top line
                    var newTopLine = startLine;
                    do {
                        newTopLine = startLine.next('.parsing');
                        removeLine(startLine, true);
                        removeTranscriptlet(startLine.attr("lineserverid"), startLine.attr("lineserverid"), true);
                        startLine = newTopLine;
                        oldHeight = parseFloat(startLine.attr("lineheight"));
                        oldTop = parseFloat(startLine.attr("linetop"));
                    } while (parseFloat(startLine.attr("linetop")) + parseFloat(startLine.attr("lineheight")) < newY);
                    //Got through all the ones that needed removing, now I am on the one that needs resizing.
                    startLine.attr({
                        "linetop"    : newY,
                        "lineheight" : oldHeight + oldTop - newY
                    });
                    startLine.css({
                        "top"    : newY + "%",
                        "height" : oldHeight + oldTop - newY + "%"
                    });
                    thisColumn.attr("startid", startLine.attr("lineserverid"));
                }
                $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
            }
        else if (adjustment === "bottom"){
            //technically, we want to track the bottom.  The bottom if the height + top offset
            var offsetForBtm = $(event.target).position().top;
            offsetForBtm = (offsetForBtm / $("#imgTop img").height()) * 100;
            newH = (newH / $("#imgTop img").height()) * 100;
            var actualBottom = newH + offsetForBtm;
            //save a new height for the bottom line
            var endLine = $(".parsing[lineserverid='" + thisColumnID[1] + "']");
            oldHeight = parseFloat(endLine.attr("lineheight"));
            oldTop = parseFloat(endLine.attr("linetop"));
            endLine.attr({
                "lineheight" : oldHeight + (newH - originalH)
            });
            endLine.css({
                "height" : oldHeight + (newH - originalH) + "%"
            });
            if (parseFloat(endLine.attr("linetop")) > actualBottom){
                //the bottom line isnt large enough to account for the change,
                // delete lines until we get to a  line that,
                // when combined with the deleted lines
                //can account for the requested change.
                do {
                oldHeight = parseFloat(endLine.attr("lineheight"));
                    oldTop = parseFloat(endLine.attr("linetop"));
                    var nextline = endLine.prev(".parsing");
                    endLine.remove();
                    removeLine(endLine, true);
                    removeTranscriptlet(endLine.attr("lineserverid"), endLine.attr("lineserverid"), true);
                    endLine = nextline;
                } while (parseFloat(endLine.attr("linetop")) > actualBottom);
                var currentLineTop = parseFloat(endLine.attr("linetop"));
                endLine.attr({
                    "lineheight" : actualBottom - currentLineTop
                });
                endLine.css({
                    "height" : actualBottom - currentLineTop + "%"
                });
                thisColumn.attr("endid", endLine.attr("lineserverid"));
            }
            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
        }
        else if (adjustment === "left"){
            //save a new left,width for all these lines
            var leftGuide = $(".parsing[lineserverid='" + thisColumnID[0] + "']");
            oldLeft = parseFloat(leftGuide.attr("lineleft"));
            var ratio1 = originalPercentW / originalW;
            var ratio2 = originalPercentX / originalX;
            newWidth = newW * ratio1;
            newLeft = newX * ratio2;
            $(".parsing[lineleft='" + oldLeft + "']").each(function(){
                $(this).attr({
                    "lineleft" : newLeft,
                    "linewidth": newWidth
                });
                    $(this).css({
                    "left" : newLeft + "%",
                    "width": newWidth + "%"
                });
            });
            updateLinesInColumn(thisColumnID);
            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
            cleanupTranscriptlets(true);
        }
        else if (adjustment === "right"){
            //save a new width for all these lines
            var rightGuide = $(".parsing[lineserverid='" + thisColumnID[0] + "']");
            oldLeft = parseFloat(rightGuide.attr("lineleft"));
            var ratio = originalPercentW / originalW;
            newWidth = newW * ratio; //new percent width
            $(".parsing[lineleft='" + oldLeft + "']").each(function(){
                $(this).attr({
                    "linewidth": newWidth
                });
                $(this).css({
                    "width": newWidth + "%"
                });
            });
            updateLinesInColumn(thisColumnID);
            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
            cleanupTranscriptlets(true);
        } else {
            $("#progress").html("No changes made.").delay(3000).fadeOut(1000);
        }
        $("#lineResizing").delay(3000).fadeOut(1000);
        adjustment = "";
        }
    });
}

/**
 * Determines action based on transcription line clicked and tool in use.
 * Alerts 'unknown click' if all fails. Calls lineChange(e,event) for
 * parsing tool. Jumps to transcriptlet for full page tool.
 */
function clickedLine(e, event) {
    //Stop ability to make a new line until the update from this process is complete.
    if ($(e).hasClass("parsing")){
        if ($("#addLines").hasClass('active') || $("#removeLines").hasClass('active')){
        $("#parsingCover").show();
            lineChange(e, event);
        }
    }
    else {
    }
}

function reparseColumns(){
    $.each($('.parsingColumn'), function(){
        var colX = $(this).attr("lineleft");
        // collect lines from column
        var lines = $(".parsing[lineleft='" + colX + "']");
        lines.addClass("deletable");
        var linesSize = lines.size();
        // delete from the end, alerting for any deleted data
        for (var i = linesSize; i > 0; i--){
            removeLine(lines[i], true);
        }
    });
}

     /**
     * Adds closing tag button to textarea.
     *
     * @param tagName text of tag for display in button
     * @param fullTag title of tag for display in button
     *
     * Function named as Added made the error:
     * transcribe.js:2831 Uncaught TypeError: closeTag is not a function(…)
     * so I had to rename it.
     */
    function closeAddedTag(tagName, fullTag){
        // Do not create for self-closing tags
        if (tagName.lastIndexOf("/") === (tagName.length - 1)) return false;
        var tagLineID = tpen.screen.focusItem[1].attr("lineserverid");
        var closeTag = document.createElement("div");
        var tagID;
        $.get("tagTracker", {
            addTag      : true,
            tag         : tagName,
            projectID   : tpen.project.id,
            line        : tagLineID,
            folio       : tpen.project.folios[tpen.screen.currentFolio].folioNumber
            }, function(data){
                tagID = data;
                $(closeTag).attr({
                    "class"     :   "tags ui-corner-all right ui-state-error",
                    "title"     :   unescape(fullTag),
                    "data-line" :   tagLineID,
                    "data-folio":   tpen.project.folios[tpen.screen.currentFolio].folioNumber,
                    "data-tagID":   tagID
                }).text("/" + tagName);
                $(".xmlClosingTags").append(closeTag); //tpen.screen.focusItem[1].children(".xmlClosingTags").append(closeTag)
            }
        );
    }

/**
     * Inserts value at cursor location.
     *
     * @param myField element to insert into
     * @param myValue value to insert
     * @return int end of inserted value position
     */
     function insertAtCursor(myValue, closingTag, fullTag, specChar) {
         //how do I pass the closing tag in?  How do i know if it exists?
        var myField = tpen.screen.focusItem[1].find('.theText')[0];
        var closeTag = (closingTag == undefined) ? "" : unescape(closingTag);

        //IE support
        if(specChar){
             if (document.selection) {
                myField.focus();
                sel = document.selection.createRange();
                sel.text = unescape(myValue);
                updateLine($(myField).parent(), false, true);
                //return sel+unescape(fullTag).length;
            }
            //MOZILLA/NETSCAPE support
            else if (myField.selectionStart || myField.selectionStart == '0') {
                var startPosChar = myField.selectionStart;
                var currentValue = myField.value;
                currentValue = currentValue.slice(0, startPosChar) + unescape(myValue) + currentValue.slice(startPosChar);
                myField.value = currentValue;
                myField.focus();
                updateLine($(myField).parent(), false, true);
            }
        }
        else{ //its an xml tag
            if (document.selection) {
                if(fullTag === ""){
                    fullTag = "</"+myValue+">";
                }
                myField.focus();
                sel = document.selection.createRange();
                sel.text = unescape(fullTag);
                updateLine($(myField).parent(), false, true);
                //return sel+unescape(fullTag).length;
            }
            //MOZILLA/NETSCAPE support
            else if (myField.selectionStart || myField.selectionStart == '0') {
                var startPos = myField.selectionStart;
                var endPos = myField.selectionEnd;
                if (startPos !== endPos) {
                    if(fullTag === ""){
                        fullTag = "</" + myValue +">";
                    }
                    // something is selected, wrap it instead
                    var toWrap = myField.value.substring(startPos,endPos);
                    closeTag = "</" + myValue +">";
                    myField.value =
                          myField.value.substring(0, startPos)
                        + unescape(fullTag)
                        + toWrap
                        + closeTag
                        + myField.value.substring(endPos, myField.value.length);
                    myField.focus();
                    updateLine($(myField).parent(), false, true);

    //                var insertLength = startPos + unescape(fullTag).length +
    //                    toWrap.length + 3 + closeTag.length;
                    //return "wrapped" + insertLength;
                }
                else {
                    myField.value = myField.value.substring(0, startPos)
                        + unescape(fullTag)
                        + myField.value.substring(startPos);
                    myField.focus();
                    updateLine($(myField).parent(), false, true);
                    closeAddedTag(myValue, fullTag);
                    //return startPos+unescape(fullTag).length;
                }
            }
            else {
                myField.value += unescape(fullTag);
                myField.focus();
                updateLine($(myField).parent(), false, true);
                closeAddedTag(myValue, fullTag);
                //return myField.length;
            }

        }

    }

    /**
     * Removes tag from screen and database without inserting.
     *
     * @param thisTag tag element
     */
     function destroyClosingTag (thisTag){
        $(thisTag).fadeOut("normal",function(){
            $(thisTag).remove();
        });
        this.removeClosingTag(thisTag);
        return false;
    }
    /**
     * Removes tag from screen and database without closing.
     *
     * @param thisTag tag element
     */
     function removeClosingTag(thisTag){
        var tagID = thisTag.getAttribute("data-tagID");
        $.get("tagTracker",{
            removeTag   : true,
            id          : tagID
        }, function(data){
            if(!data){
                alert("Database communication error.\n(openTagTracker.removeTag:removal "+tagID+")");
            }
        });
    }
    //make tags visible or invisible depending on location
    /**
     * Hides or shows closing tags based on origination.
     */
      function updateClosingTags(){
        var tagIndex = 0;
        var tagFolioLocation = 0;
        var currentLineLocation = tpen.screen.focusItem[1].index();
        var currentFolioLocation = tpen.project.folios[tpen.screen.currentFolio].folioNumber;
        tpen.screen.focusItem[1].find("div.tags").each(function(){
            tagFolioLocation = parseInt($(this).attr("data-folio"),10);
            tagIndex = $(".transcriptlet[data-lineid='"+$(this).attr("data-line")+"']").index();
            if (tagFolioLocation == currentFolioLocation && tagIndex > currentLineLocation) {
            // tag is from this page, but a later line
                $(this).hide();
            } else {
            //tag is from a previous page or line
                $(this).show();
            }
        });
    }
    //use String[] from TagTracker.getTagsAfterFolio() to build the live tags list
    /**
     * Builds live tags list from string and insert closing buttons.
     * Uses String[] from utils.openTagTracker.getTagsAfterFolio().
     *
     * @param tags comma separated collection of live tags and location properties
     */
     function buildClosingTags(tags){
        var thisTag;
        var closingTags = [];
        for (var i=0;i<tags.length;i++){
            thisTag = tags[i].split(",");
            var tagID               =   thisTag[0];
            var tagName             =   thisTag[1];
            var tagFolioLocation    =   thisTag[2];
            var tagLineLocation     =   thisTag[3];
            if (tagID>0){        //prevent the proliferation of bogus tags that did not input correctly
                closingTags.push("<div class='tags ui-corner-all right ui-state-error");
                if (parseInt(tpen.project.folios[tpen.screen.currentFolio].folioNumber) !== parseInt(tagFolioLocation)) {
                    closingTags.push(" ui-state-disabled' title='(previous page) ");
                } else {
                    closingTags.push("' title='");
                }
                closingTags.push(tagName,"' data-line='",tagLineLocation,"' data-folio='",tagFolioLocation,"' data-tagID='",tagID,"'>","/",tagName,"</div>");
            }
        }
        $(".xmlClosingTags").html(closingTags.join(""));
        $(".tags").click(function(event){
            //we could detect if tag is in this line.
            if(event.target != this){return true;}
            //makeUnsaved();
            addchar("<" + $(this).text() + ">"); //there's an extra / somehow...
            destroyClosingTag(this);
        });
        $(".tags").mouseenter(function(){
            $(this).css({
                "padding": "4px",
                "margin": "-3px -4px -2px -3px",
                "z-index": 21
            })
            .append("<span onclick='destroyClosingTag(this.parentNode);' class='destroyTag ui-icon ui-icon-closethick right'></span>");
        });
        $(".tags").mouseleave(function(){
            $(this).css({
                "padding": "1px",
                "margin": "0px -1px 1px 0px",
                "z-index": 20
            })
            .find(".destroyTag").remove();
        });
    }



function addchar(theChar, closingTag) {
    var closeTag = (closingTag === undefined) ? "" : closingTag;
    var e = tpen.screen.focusItem[1].find('.theText')[0];
    if (e !== null) {
        insertAtCursor(theChar, closeTag, "", true);
    }
}

//function setCursorPosition(e, position) {
//    var pos = position;
//    var wrapped = false;
//    if (pos.toString().indexOf("wrapped") === 0) {
//        pos = parseInt(pos.substr(7));
//        wrapped = true;
//    }
//    e.focus();
//    if (e.setSelectionRange) {
//        e.setSelectionRange(pos, pos);
//    }
//    else if (e.createTextRange) {
//        e = e.createTextRange();
//        e.collapse(true);
//        e.moveEnd('character', pos);
//        e.moveStart('character', pos);
//        e.select();
//    }
//    return wrapped;
//}


function toggleCharacters(){
    if ($("#charactersPopin .character:first").is(":visible")){
        $("#charactersPopin .character").fadeOut(400);
    }
    else{
        $("#charactersPopin .character").fadeIn(400).css("display", "block");
    }
}

function toggleTags(){
    if ($("#xmlTagPopin .lookLikeButtons:first").is(":visible")){
        $("#xmlTagPopin .lookLikeButtons").fadeOut(400);
    }
    else{
        $("#xmlTagPopin .lookLikeButtons").fadeIn(400).css("display", "block");
    }
}

function togglePageJump(){
    if ($("#pageJump .folioJump:first").is(":visible")){
        $("#pageJump .folioJump").fadeOut(400);
    }
    else{
        $("#pageJump .folioJump").fadeIn(400).css("display", "block");
    }
}

/* Change the page to the specified page from the drop down selection. */
function pageJump(page, parsing){
    var canvasToJumpTo = parseInt(page);; //0,1,2...
    if (tpen.screen.currentFolio !== canvasToJumpTo && canvasToJumpTo >= 0){ //make sure the default option was not selected and that we are not jumping to the current folio
        console.log("Jumping to a dif page!");
        Data.saveTranscription("");
        tpen.screen.currentFolio = canvasToJumpTo;
        if (parsing === "parsing"){
            $(".pageTurnCover").show();
            fullPage();
            tpen.screen.focusItem = [null, null];
            redraw(parsing);
            //loadTranscriptionCanvas(tpen.manifest.sequences[0].canvases[canvasToJumpTo], parsing);
            setTimeout(function(){
                hideWorkspaceForParsing();
                $(".pageTurnCover").fadeOut(1500);
            }, 800);
        }
        else {
            tpen.screen.currentFolio = canvasToJumpTo;
            tpen.screen.focusItem = [null, null];
            redraw("");
            //loadTranscriptionCanvas(tpen.manifest.sequences[0].canvases[canvasToJumpTo], "");
        }
    }
    else{
    }
}

function compareJump(folio){
    populateCompareSplit(folio);
}

/* Change color of lines on screen */
function markerColors(){
/*
 * This function allows the user to go through annotation colors and decide what color the outlined lines are.
 * colorThisTime
 */
    var tempColorList = ["rgba(153,255,0,.4)", "rgba(0,255,204,.4)", "rgba(51,0,204,.4)", "rgba(204,255,0,.4)", "rgba(0,0,0,.4)", "rgba(255,255,255,.4)", "rgba(255,0,0,.4)"];
    if (tpen.screen.colorList.length === 0){
        tpen.screen.colorList = tempColorList;
    }
    var index = tpen.screen.colorList.indexOf(tpen.screen.colorThisTime);
    if(index++>tpen.screen.colorList.length){
        index = 0;
    }
    var color = tpen.screen.colorThisTime = tpen.screen.colorList[index];
//    var oneToChange = tpen.screen.colorThisTime.lastIndexOf(")") - 2;
//    var borderColor = tpen.screen.colorThisTime.substr(0, oneToChange) + '.2' + tpen.screen.colorThisTime.substr(oneToChange + 1);
//    var lineColor = tpen.screen.colorThisTime.replace(".4", ".9"); //make this color opacity 100
    $('.lineColIndicator').css('border', '1px solid ' + color);
    $('.lineColOnLine').css({'border-left':'1px solid ' + color, 'color':color});
    $('.activeLine').css({
//        'box-shadow' : '0px 0px 15px 8px ' + color,
        'box-shadow' : '0 0 15px black',
        'opacity' : .4
    }); //keep this color opacity .4 until imgTop is hovered.
}

/* Toggle the line/column indicators in the transcription interface. (A1, A2...) */
function toggleLineMarkers(){
    if ($('.lineColIndicator:first').is(":visible")
        && $('.lineColIndicator:eq(1)').is(":visible")){ //see if a pair of lines are visible just in case you checked the active line first.
        $('.lineColIndicator').hide();
        $(".activeLine").show().addClass("linesHidden");
    }
    else {
        $('.lineColIndicator').show();
        $(".lineColIndicator").removeClass("linesHidden");
        $.each($(".lineColOnLine"), function(){$(this).css("line-height", $(this).height() + "px"); });
    }
}

/* Toggle the drawn lines in the transcription interface. */
function toggleLineCol(){
    if ($('.lineColOnLine:first').is(":visible")){
        $('.lineColOnLine').hide();
    }
    else{
        $('.lineColOnLine').show();
        $.each($(".lineColOnLine"), function(){$(this).css("line-height", $(this).height() + "px"); });
    }
}

function updateLinesInColumn(column){
    var startLineID = column[0];
    var endLineID = column[1];
    var startLine = $(".parsing[lineserverid='" + startLineID + "']"); //Get the start line
    var nextLine = startLine.next(".parsing"); //Get the next line (potentially)
    var linesToUpdate = [];
    linesToUpdate.push(startLine); //push first line
    while (nextLine.length > 0 && nextLine.attr("lineserverid") !== endLineID){ //if there is a next line and its not the last line in the column...
        linesToUpdate.push(nextLine);
        nextLine = nextLine.next(".parsing");
    }
    if (startLineID !== endLineID){ //push the last line, so long as it was also not the first line
        linesToUpdate.push($(".parsing[lineserverid='" + endLineID + "']")); //push last line
    }
    batchLineUpdate(linesToUpdate);
}

/* Bulk update for lines in a column.  Also updates annotation list those lines are in with the new anno data. */
function batchLineUpdate(linesInColumn, relocate){
    var onCanvas = $("#transcriptionCanvas").attr("canvasid");
    var currentAnnoListID = tpen.screen.currentAnnoListID;
    var currentAnnoListResources = [];
    var lineTop, lineLeft, lineWidth, lineHeight = 0;
    var ratio = originalCanvasWidth2 / originalCanvasHeight2; //Can I use tpen.screen.originalCanvasHeight and Width?
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
        //Go over each line from the column resize.
    $.each(linesInColumn, function(){
        var line = $(this);
        lineTop = parseFloat(line.attr("linetop")) * 10;
        lineLeft = parseFloat(line.attr("lineleft")) * (10 * ratio);
        lineWidth = parseFloat(line.attr("linewidth")) * (10 * ratio);
        lineHeight = parseFloat(line.attr("lineheight")) * 10;
        //round up.
        lineTop = Math.round(lineTop, 0);
        lineLeft = Math.round(lineLeft, 0);
        lineWidth = Math.round(lineWidth, 0);
        lineHeight = Math.round(lineHeight, 0);
        line.css("width", line.attr("linewidth") + "%");
        var lineString = lineLeft + "," + lineTop + "," + lineWidth + "," + lineHeight;
        var currentLineServerID = line.attr('lineserverid');
        var currentLineText = $(".transcriptlet[lineserverid='" + currentLineServerID + "']").find("textarea").val();
        var lineNote = $(".transcriptlet[lineserverid='" + currentLineServerID + "']").find(".notes").val();
        var dbLine = {
            "@id" : currentLineServerID,
            "@type" : "oa:Annotation",
            "motivation" : "sc:painting",
            "resource" : {
                "@type" : "cnt:ContentAsText",
                "cnt:chars" : currentLineText
            },
            "on" : onCanvas + "#xywh=" + lineString,
            "otherContent" : [],
            "forProject": tpen.manifest['@id'],
            "_tpen_note" : lineNote,
            "testing":"TPEN28"
        };
        var index = - 1;
        //find the line in the anno list resources and replace its position with the new line resource.
        $.each(currentAnnoList, function(){
            index++;
            if (this["@id"] == currentLineServerID){
                currentAnnoList[index] = dbLine;
                return false;
            }
        });
    });
    //Now that all the resources are edited, update the list.
    tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources = currentAnnoList;
    var url = "updateAnnoList";
    var paramObj = {
        "@id":currentAnnoListID,
        "resources": currentAnnoList
    };
    var url2 = "bulkUpdateAnnos";
    var paramObj2 = {"annos":currentAnnoList};
    var params2 = {"content":JSON.stringify(paramObj2)};

    $.post(url2, params2, function(data){ //update individual annotations
        var params = {"content":JSON.stringify(paramObj)};
        $.post(url, params, function(data2){ //update annotation list
            if(relocate){
                document.location = relocate;
            }
        });
    });


}


    function drawLinesOnCanvas(lines, parsing, tool){
        if (lines.length > 0){
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
            linesToScreen(lines, tool);
        }
        else { //list has no lines
            if (parsing !== "parsing") {
                $("#noLineWarning").show();
            }
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
            $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
            $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
            $("#imgTop").css("height", $("#imgTop img").height() + "px");
            $("#imgTop img").css("top", "0px");
            $("#imgBottom").css("height", "inherit");
            $("#parsingBtn").css("box-shadow", "0px 0px 6px 5px yellow");
        }
        updateURL("p");
    }

    function getList(canvas, drawFlag, parsing, tool){ //this could be the @id of the annoList or the canvas that we need to find the @id of the list for.
        var lists = [];
        var annos = [];
        if(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[0].resources){
            tpen.screen.dereferencedLists[tpen.screen.currentFolio] = tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[0];
            return tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[0].resources;
        }
        if(tpen.screen.dereferencedLists[tpen.screen.currentFolio]){
            annos = tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources;
            //tpen.screen.currentAnnoListID = tpen.screen.dereferencedLists[tpen.screen.currentFolio]["@id"];
            if(drawFlag){
                drawLinesOnCanvas(annos, parsing, tool);
            }
            return annos;
        }
        else{
            if(canvas.otherContent){
                lists = canvas.otherContent;
            }
            else{
                console.warn("canvas to get anno list for does not have otherContent");
                lists = "noList";
            }
            for(var i=0; i<lists.length; i++){
                var list = lists[i];
                $.get(list, function(annoListData){
                    if(annoListData.proj === parseInt(tpen.project.id)){
                        tpen.screen.currentAnnoListID = list;
                        tpen.screen.dereferencedLists[tpen.screen.currentFolio] = annoListData;
                        if (annoListData.resources) {
                            var resources = annoListData.resources;
                            //Here is when we would set empty, but its best just to return the empty array.  Maybe get rid of "empty" check in this file.
                            for(var l=0; l<resources.length; l++){
                                var currentResource = resources[l];
                                if(currentResource.on.startsWith(canvas['@id'])){
                                     annos.push(currentResource);
                                 }
                            }
                        }
                        if(drawFlag){
                            drawLinesOnCanvas(annos, parsing, tool);
                        }
                        return annos;
                    }
                });
            }
        }

    };

/*
 * Update line information for a particular line. Until we fix the data schema, this also forces us to update the annotation list for any change to a line.
 *
 * Included in this is the interaction with #saveReport, which populates with entries if a change to a line's text or comment has occurred (not any positional change).
 *
 * */
function updateLine(line, cleanup, updateList){
    var onCanvas = $("#transcriptionCanvas").attr("canvasid");
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
    var lineTop, lineLeft, lineWidth, lineHeight = 0;
    var ratio = originalCanvasWidth2 / originalCanvasHeight2;
    //Can I use tpen.screen.originalCanvasHeight and Width?  IDK yet, untested.

    lineTop = parseFloat(line.attr("linetop")) * 10;
    lineLeft = parseFloat(line.attr("lineleft")) * (10 * ratio);
    lineWidth = parseFloat(line.attr("linewidth")) * (10 * ratio);
    lineHeight = parseFloat(line.attr("lineheight")) * 10;
    //round up.
    lineTop = Math.round(lineTop, 0);
    lineLeft = Math.round(lineLeft, 0);
    lineWidth = Math.round(lineWidth, 0);
    lineHeight = Math.round(lineHeight, 0);
    var lineString = lineLeft + "," + lineTop + "," + lineWidth + "," + lineHeight;
    var currentLineServerID = line.attr('lineserverid');
    var currentLineText = $(".transcriptlet[lineserverid='" + currentLineServerID + "']").find(".theText").val();
    var currentLineNotes = $(".transcriptlet[lineserverid='" + currentLineServerID + "']").find(".notes").val();
    var currentLineTextAttr = unescape(line.attr("data-answer"));
    var currentLineNotesAttr = unescape(line.find(".notes").attr("data-answer"));
    var params = new Array({name:'submitted',value:true},{name:'folio',value:tpen.project.folios[tpen.screen.currentFolio].folioNumber},{name:'projectID',value:tpen.project.id});
    var params2 = new Array({name:'submitted',value:true},{name:'projectID',value:tpen.project.id});
    var updateContent = false;
    var updatePositions = false;
    if(tpen.screen.liveTool === "parsing"){
        //OR it was from bump line in the trasncription interface.  How do I detect that?  This is overruled below until we figure that out.
        updatePositions = true;
    }
//    var currentAnnoListID = tpen.screen.currentAnnoListID;
    var dbLine = {
        "@id" : currentLineServerID,
        "@type" : "oa:Annotation",
        "motivation" : "oad:transcribing",
        "resource" : {
            "@type" : "cnt:ContentAsText",
            "cnt:chars" : currentLineText
        },
        "on" : onCanvas + "#xywh=" + lineString,
        "otherContent" : [],
        "forProject": tpen.manifest['@id'],
        "_tpen_note" : currentLineNotes,
        "testing":"TPEN28"
    };
//    if (!currentAnnoListID){ //BH 12/21/16 we need to skip this check now since we don't have a anno list ID anymore
//        if(!currentAnnoList){
//            throw new Error("No annotation list found.");
//        } else if (typeof currentAnnoList==="string"){
//            // unlikely, but just in case
//            $.getJSON(currentAnnoList,function(list){
//                tpen.screen.currentAnnoList = tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[tpen.screen.currentAnnoList] = list;
//                return updateLine(line, cleanup, updateList);
//            }).fail(function(err){
//                throw err;
//            });
//        } else if ($.isArray(currentAnnoList.resources)){
//            throw new Error("Everything looks good, but it didn't work.");
//        } else {
//            throw new Error("Annotation List was not recognized.");
//        }
//    }
//    else if (currentAnnoListID){
        var lineID = (line != null) ? $(line).attr("lineserverid") : -1;
        lineID = parseInt(lineID.replace("line/", "")); //TODO check this in the future to make sure you are getting the lineID and not some string here.
        if (lineID>0 || $(line).attr("id")=="dummy"){
            params.push(
                {name:"updatey",value:lineTop},
                {name:"updatex",value:lineLeft},
                {name:"updatewidth",value:lineWidth},
                {name:"updateheight",value:lineHeight},
                {name:"update",value:lineID}
            );
            updatePositions = true; //This will always be true, which we want right now.  Up at the top there is a check for it, but I need the OR to make it happen.
        }
        else{
            updatePositions = false;
        }
        //isDestroyingLine = false;
//        if(currentLineServerID.startsWith("http")){ //@cubap FIXME: do we need this check anymore?
        var url = "updateLinePositions"; //updateAnnoList
        var url2 = "updateLineServlet";
//            var payload = { // Just send what we expect to update
//                    content : JSON.stringify({
//                    "@id" : dbLine['@id'],			// URI to find it in the repo
//                    "resource" : dbLine.resource,	// the transcription content
//                    "on" : dbLine.on,
//                    "_tpen_note": dbLine._tpen_note// parsing update of xywh=
//            	})
 //           }
            //var url1 = "updateAnnoList";
            clearTimeout(typingTimer);
            for(var i=0  ;i < currentAnnoList.length; i++){
                if(currentAnnoList[i]["@id"] === dbLine['@id']){
                    currentAnnoList[i].on = dbLine.on;
                    currentAnnoList[i].resource = dbLine.resource;
                    currentAnnoList[i]._tpen_note = dbLine._tpen_note; //@cubap FIXME:  How do we handle notes now?
                }
                if(i===currentAnnoList.length -1){
                    tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources = currentAnnoList;
//                    var paramObj1 = {"@id":tpen.screen.currentAnnoListID, "resources": currentAnnoList};
//                    var params1 = {"content":JSON.stringify(paramObj1)};
//                    $.post(url1, params1, function(data){
//                    });
                }
            }

            if(currentLineText === currentLineTextAttr && currentLineNotes === currentLineNotesAttr){
                //This line's text has not changed, and neither does the notes
                updateContent = false;
                $("#saveReport")
                .stop(true,true).animate({"color":"red"}, 400)
                .prepend("<div class='noChange'>No changes made</div>")//
                .animate({"color":"#618797"}, 1600,function(){$("#saveReport").find(".noChange").remove();});
                $("#saveReport").find(".nochanges").show().fadeOut(2000);
            }
            else{ //something about the line text or note text has changed.
                params2.push({name:"comment", value:currentLineNotes});
                params2.push({name:"text", value:currentLineText});
                params2.push({name:"line",value:lineID});
                updateContent = true;
                var columnMark = "Column&nbsp;"+line.attr("col")+"&nbsp;Line&nbsp;"+line.attr("collinenum");
                var date=new Date();
                $("#saveReport")
                .stop(true,true).animate({"color":"green"}, 400)
                .prepend("<div class='saveLog'>"+columnMark + '&nbsp;saved&nbsp;at&nbsp;'+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+"</div>")//+", "+Data.dateFormat(date.getDate())+" "+month[date.getMonth()]+" "+date.getFullYear())
                .animate({"color":"#618797"}, 600);
            }
            line.attr("data-answer", currentLineText);
            line.find(".notes").attr("data-answer", currentLineNotes);
            //FIXME: REST says this should be PUT

            //@cubap 12/21/16 FIXME: Is it ok to run this after every line change or typingTimer no matter what, or should there be a check for change?
            if(updatePositions){
                $.post(url,params,function(){
                    line.attr("hasError",null);
                    $("#parsingCover").hide();
                    // success
                }).fail(function(err){
                    line.attr("hasError","Saving Failed "+err.status);
                    throw err;
                });
            }
            if(updateContent){
                $.post(url2,params2,function(){
                    line.attr("hasError",null);
                    $("#parsingCover").hide();
                    // success
                }).fail(function(err){
                    line.attr("hasError","Saving Failed "+err.status);
                    throw err;
                });
            }
//        } else {
//            throw new Error("No good. The ID could not be dereferenced. Maybe this is a new annotation?");
//        }
        //I am not sure if cleanup is ever true
        if (cleanup) cleanupTranscriptlets(true);
        updateClosingTags();
    }



function saveNewLine(lineBefore, newLine){
    var projID = tpen.project.id;
    var beforeIndex = - 1;
    if (lineBefore !== undefined && lineBefore !== null){
        beforeIndex = parseInt(lineBefore.attr("linenum"));
    }
    var onCanvas = $("#transcriptionCanvas").attr("canvasid");
    var newLineTop, newLineLeft, newLineWidth, newLineHeight = 0;
    var oldLineTop, oldLineLeft, oldLineWidth, oldLineHeight = 0;
    var ratio = originalCanvasWidth2 / originalCanvasHeight2;
    //Can I use tpen.screen.originalCanvasHeight and Width?
    newLineTop = parseFloat(newLine.attr("linetop"));
    newLineLeft = parseFloat(newLine.attr("lineleft"));
    newLineWidth = parseFloat(newLine.attr("linewidth"));
    newLineHeight = parseFloat(newLine.attr("lineheight"));
    newLineTop = newLineTop * 10;
    newLineLeft = newLineLeft * (10 * ratio);
    newLineWidth = newLineWidth * (10 * ratio);
    newLineHeight = newLineHeight * 10;
    //round up.
    newLineTop = Math.round(newLineTop, 0);
    newLineLeft = Math.round(newLineLeft, 0);
    newLineWidth = Math.round(newLineWidth, 0);
    newLineHeight = Math.round(newLineHeight, 0);

    if(lineBefore){
        oldLineTop = parseFloat(lineBefore.attr("linetop"));
        oldLineLeft = parseFloat(lineBefore.attr("lineleft"));
        oldLineWidth = parseFloat(lineBefore.attr("linewidth"));
        oldLineHeight = parseFloat(lineBefore.attr("lineheight"));
        oldLineTop = oldLineTop * 10;
        oldLineLeft = oldLineLeft * (10 * ratio);
        oldLineWidth = oldLineWidth * (10 * ratio);
        oldLineHeight = oldLineHeight * 10;
        //round up.
        oldLineTop = Math.round(oldLineTop, 0);
        oldLineLeft = Math.round(oldLineLeft, 0);
        oldLineWidth = Math.round(oldLineWidth, 0);
        oldLineHeight = Math.round(oldLineHeight, 0);
    }
    var lineString = onCanvas + "#xywh=" + newLineLeft + "," + newLineTop + "," + newLineWidth + "," + newLineHeight;
    var updateLineString =  onCanvas + "#xywh=" + oldLineLeft + "," + oldLineTop + "," + oldLineWidth + "," + oldLineHeight;
    var currentLineText = "";
    var dbLine = {
        "@id" : "",
        "@type" : "oa:Annotation",
        "motivation" : "oad:transcribing",
        "resource" : {
            "@type" : "cnt:ContentAsText",
            "cnt:chars" : currentLineText
        },
        "on" : lineString,
        "otherContent":[],
        "forProject": tpen.manifest['@id'],
        "_tpen_note": "",
        "_tpen_creator" : tpen.user.UID,
        "testing":"TPEN28"
    };
    var url = "updateLinePositions"; //saveNewTransLineServlet
    var params = new Array(
        {name:"newy",value:newLineTop},
        {name:"newx",value:newLineLeft},
        {name:"newwidth",value:newLineWidth},
        {name:"newheight",value:newLineHeight},
        {name:"new",value:true}
    );
    if (onCanvas !== undefined && onCanvas !== ""){
        $.post(url, params, function(data){
            data = JSON.parse(data);
            dbLine["@id"] = data;
            newLine.attr("lineserverid", data); //data["@id"]
            $("div[newcol='" + true + "']").attr({
                "startid" : data, //dbLine["@id"]
                "endid" : data, //dbLine["@id"]
                "newcol":false
            });
            var currentFolio = tpen.screen.currentFolio;
            var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
            if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
                // if it IIIF, we need to update the list
                if (beforeIndex == - 1){
                    $(".newColumn").attr({
                        "lineserverid" : data,
                        "linenum" : $(".parsing").length
                    }).removeClass("newColumn");
                    currentAnnoList.push(dbLine); //@cubap FIXME: what should we do for dbLine here?  What does the currentAnnoList look like.
                }
                else {
                    currentAnnoList.splice(beforeIndex + 1, 0, dbLine); //@cubap FIXME: what should we do for dbLine here?  What does the currentAnnoList look like?
                    currentAnnoList[beforeIndex].on = updateLineString;
                }
                currentFolio = parseInt(currentFolio);
                //Write back to db to update list
                tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources = currentAnnoList; //@cubap this is why the FIXMEs above
                updateLine(lineBefore, false, false); //This will update the line on the server.
                $("#parsingCover").hide();
//                var url1 = "updateAnnoList";
//                var paramObj1 = {"@id":tpen.screen.currentAnnoListID, "resources": currentAnnoList};
//                var params1 = {"content":JSON.stringify(paramObj1)};
//                $.post(url1, params1, function(data){
//                    if (lineBefore !== undefined && lineBefore !== null){
//                        //This is the good case.  We called split line and saved
//                        //the new line, now we need to update the other one.
//
//                    }
//                    else{
//                    }
//                        $("#parsingCover").hide();
//                });

            }
            /*
            else if (currentAnnoList == "empty"){ //Not sure we need to handle this with the roll back.
                //This means we know no AnnotationList was on the store for this canvas,
                //and otherContent stored with the canvas object did not have the list.
                // Make a new one in this case.
                var newAnnoList = {
                    "@type" : "sc:AnnotationList",
                    "on" : onCanvas,
                    "originalAnnoID" : "",
                    "version" : 1,
                    "permission" : 0,
                    "forkFromID" : "",
                    "resources" : [],
                    "proj" : projID,
                    "testing":"TPEN28"
                };
                var url2 = "saveNewTransLineServlet";
                var params2 = {"content": JSON.stringify(newAnnoList)};
                $.post(url2, params2, function(data){ //save new list
                    data = JSON.parse(data);
                    var newAnnoListCopy = newAnnoList;
                    newAnnoListCopy["@id"] = data["@id"];
                    currentFolio = parseInt(currentFolio);
                    tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent.push(newAnnoListCopy);
                    var url3 = "updateAnnoList";
                    tpen.screen.dereferencedLists[tpen.screen.currentFolio] = {};
                    var paramObj3 = {"@id":newAnnoListCopy["@id"], "resources": [dbLine]};
                    var params3 = {"content":JSON.stringify(paramObj3)};
                    $.post(url3, params3, function(data){
                        $(".newColumn").attr({
                            "lineserverid" : dbLine["@id"],
                            "startid" : dbLine["@id"],
                            "endid" : dbLine["@id"],
                            "linenum" : $(".parsing").length
                        }).removeClass("newColumn");
                        newLine.attr("lineserverid", dbLine["@id"]);
                        $("#parsingCover").hide();
                    });
                });
            }
            */
            else if (currentAnnoList == "noList"){
                //noList is a special scenario for handling classic T-PEN objects.
                if (beforeIndex == - 1){ //New line vs new column
                    $(".newColumn").attr({
                        "lineserverid" : dbLine["@id"],
                        "startid" : dbLine["@id"],
                        "endid" : dbLine["@id"],
                        "linenum" : $(".parsing").length
                    }).removeClass("newColumn");
                    currentFolio = parseInt(currentFolio);
                    tpen.manifest.sequences[0].canvases[currentFolio - 1].resources.push(dbLine);
                }
                else {
                    currentFolio = parseInt(currentFolio);
                    tpen.manifest.sequences[0].canvases[currentFolio - 1].resources.splice(beforeIndex + 1, 0, dbLine);
                }
                $("#parsingCover").hide();
                // QUERY: should we write to the DB here?  This would be in support of old data.
            }
            cleanupTranscriptlets(true);
        });
    }
    else{
        throw new Error("Cannot save line.  Canvas id is not present.");
    }
}

/**
 * Inserts new transcriptlet when line is added.
 * Cleans up inter-transcriptlet relationships afterwards.
 *
 * @param e line element to build transcriptlet from
 * @param afterThisID lineid of line before new transcriptlet
 * @param newLineID lineid of new line
 */
function buildTranscriptlet(e, afterThisID, newServerID){
    var newLineID = $(".transcriptlet").length + 1;
    var isNotColumn = true;
    var newW = e.attr("linewidth");
    var newX = e.attr("lineleft");
    var newY = e.attr("linetop");
    var newH = e.attr("lineheight");
    if (afterThisID === - 1) {
        // new column, find its placement
        afterThisID = $(".transcriptlet").eq( - 1).attr("lineserverid") || - 1;
        $(".transcriptlet").each(function(index) {
            if ($(this).find('lineLeft') > newX) {
                afterThisID = (index > 0) ? $(this).prev('.transcriptlet').attr("lineserverid") : - 1;
                return false;
            }
        });
        isNotColumn = false;
    }
    var $afterThis = $(".transcriptlet[lineserverid='" + afterThisID + "']");
    var newTranscriptlet = [
        "<div class='transcriptlet transcriptletBefore' id='transciptlet_", newLineID,
        "' lineserverid='", newServerID, // took out style DEBUG
        "lineheight= ", newH,
        "linewidth= ", newW,
        "linetop= ", newY,
        "lineleft= ", newX,
        "lineid= ", ,
        "col= ", ,
        "collinenum= ", ,
        "'>\n",
        "<span class='counter wLeft ui-corner-all ui-state-active ui-button'>Inserted Line</span>\n",
        "<textarea></textarea>\n",
        "</div>"].join("");
    if (isNotColumn){
        //update transcriptlet that was split
        $afterThis.after(newTranscriptlet).find(".lineHeight")
            .val($(".parsing[lineserverid='" + afterThisID + "']")
            .attr("lineheight"));
    }
    else {
        if (afterThisID === - 1) {
            $("#entry").prepend(newTranscriptlet.join(""));
        }
        else {
            $afterThis.after(newTranscriptlet.join(""));
        }
    }
    $(e).attr("lineserverid", newServerID);
}

/**
 * Adds a line by splitting the current line where it was clicked.
 *
 * @param e clicked line element
 * @see organizePage(e)
 */
function splitLine(e, event){
    //e is the line that was clicked in
    //This is where the click happened relative to img top.  In other words, where the click happened among the lines.
    var originalLineHeight = $(e).height(); //-1 take one px off for the border
    $(".parsing").attr("newline", "false");
    var originalLineTop = $(e).offset().top - $("#imgTop").offset().top; // +1 Move down one px for the border.
    var clickInLines = event.pageY - $("#imgTop").offset().top;
    var lineOffset = $(e).offset().top - $("#imgTop").offset().top;
    var oldLineHeight = (clickInLines - lineOffset) / $("#imgTop").height() * 100;
    var newLineHeight = (originalLineHeight - (clickInLines - originalLineTop)) / $("#imgTop").height() * 100;
    var newLineTop = (clickInLines / $("#imgTop").height()) * 100;
    var newLine = $(e).clone(true);
    $(e).css({
        "height"    :   oldLineHeight + "%"
    }).attr({
        "newline"   :   true,
        "lineheight" :  oldLineHeight
    });
    $(newLine).css({
        "height"    :   newLineHeight + "%",
        "top"       :   newLineTop + "%"
    }).attr({
        "newline"   :   true,
        "linetop"   :   newLineTop,
        "lineheight" : newLineHeight
    });
    $(e).after(newLine);
    var newNum = - 1;
    $.each($(".parsing"), function(){
        newNum++;
        $(this).attr("linenum", newNum);
    });
    saveNewLine($(e), newLine);
    $("#progress").html("Line Added").fadeIn(1000).delay(3000).fadeOut(1000);
}

/**
 * Removes clicked line, merges if possible with the following line.
 * updateLine(e,additionalParameters) handles the original, resized line.
 *
 * @param e clicked line element from lineChange(e) via saveNewLine(e)
 * @see lineChange(e)
 * @see saveNewLine(e)
 */
function removeLine(e, columnDelete){
    $("#imageTip").hide();
    var removedLine = $(e);
    if (columnDelete){
        var lineID = "";
        removedLine.remove();
        return false;
    }
    else {
        if ($(e).attr("lineleft") == $(e).next(".parsing").attr("lineleft")) {
            removedLine = $(e).next();
            var removedLineHeight = removedLine.height();
            var currentLineHeight = $(e).height();
            var newLineHeight = removedLineHeight + currentLineHeight;
            var convertedNewLineHeight = newLineHeight / $("#imgTop").height() * 100;
            $(e).css({
                "height" :  convertedNewLineHeight + "%",
                "top" :     $(e).css("top")
            }).addClass("newDiv").attr({
                "lineheight":   convertedNewLineHeight
            });
        } else if ($(e).hasClass("deletable")){
            var cfrm = confirm("Removing this line will remove any data contained as well.\n\nContinue?");
            if (!cfrm){
                $("#parsingCover").hide();
                return false;
            }
            tpen.screen.isDestroyingLine = true;
        }
        var params = new Array({name:"remove", value:removedLine.attr("lineserverid")});
        removedLine.remove();
        removeTranscriptlet(removedLine.attr("lineserverid"), $(e).attr("lineserverid"), true, "cover");
        return params;
    }
}

/**
 * Removes transcriptlet when line is removed. Updates transcriplet
 * if line has been merged with previous.
 *
 * @param lineid lineid to remove
 * @param updatedLineID lineid to be updated
 */
function removeTranscriptlet(lineid, updatedLineID, draw, cover){
    //update remaining line, if needed
    $("#parsingCover").show();
    var updateText = "";
    var removeNextLine = false;
    if (lineid !== updatedLineID){
        removeNextLine = true;
        var updatedLine = $(".parsing[lineserverid='" + updatedLineID + "']");
        var removedLine1 = $(".parsing[lineserverid='" + lineid + "']");
        var removedLine2 = $(".transcriptlet[lineserverid='" + lineid + "']");
        var toUpdate = $(".transcriptlet[lineserverid='" + updatedLineID + "']");
        var removedText = $(".transcriptlet[lineserverid='" + lineid + "']").find("textarea").val();
        toUpdate.find("textarea").val(function(){
            var thisValue = $(this).val();
            if (removedText !== undefined){
                if (removedText !== "") thisValue += (" " + removedText);
                updateText = thisValue;
            }
            return thisValue;
        });
        var lineHeightForUpdate = parseFloat(toUpdate.attr("lineheight")) + parseFloat(removedLine2.attr("lineheight"));
        toUpdate.attr("lineheight", lineHeightForUpdate);
    }
    else {
    }
    var currentFolio = parseInt(tpen.screen.currentFolio);
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
    if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
        $.each(currentAnnoList, function(index){
            var lineIDToCheck = "";
            if (removeNextLine){
                lineIDToCheck = lineid;
                removedLine2.remove(); //remove the transcriptlet from UI
            }
            else{
                lineIDToCheck = updatedLineID;
            }
            if (this["@id"] === lineIDToCheck){
                currentAnnoList.splice(index, 1);
                var url = "updateAnnoList";
                tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio] = currentAnnoList;
                var paramObj = {"@id":tpen.screen.currentAnnoListID, "resources": currentAnnoList};
                var params = {"content":JSON.stringify(paramObj)};
                $.post(url, params, function(data){
                    if (!removeNextLine){
                        $("#parsingCover").hide();
                    }
                    else {
                        updateLine(toUpdate, false, false); //put $(#parsingCover).hide() in updateLine(), but may just need it here for this scenario.
                    }
                });
            }
        });
    }
    else if (currentAnnoList == "empty"){
        throw new Error("There is no anno list assosiated with this anno.  This is an error.");
    }
    else { // If it is classic T-PEN, we need to update canvas resources
        currentFolio = parseInt(currentFolio);
        $.each(tpen.manifest.sequences[0].canvases[currentFolio - 1].resources, function(){
            index++;
            if (this["@id"] == lineid){
                tpen.manifest.sequences[0].canvases[currentFolio - 1].resources.splice(index, 1);
                //update for real
            }
        });
    }
    //When it is just one line being removed, we need to redraw.  When its the whole column, we just delete.
    cleanupTranscriptlets(draw);
}

/* Remove all transcriptlets in a column */
function removeColumnTranscriptlets(lines, recurse){
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
    $("#parsingCover").show();
    if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
        // if it IIIF, we need to update the list
            for (var l = lines.length - 1; l >= 0; l--){
                var theLine = $(lines[l]);
                for(var k=0; k<currentAnnoList.length; k++){
                    var currentResource = currentAnnoList[k];
                    if (currentResource["@id"] == theLine.attr("lineserverid")){
                        currentAnnoList.splice(k, 1);
                        theLine.remove();
                    }
                }
                if (l === 0){
                    var url = "updateAnnoList";
                    var paramObj = {"@id":tpen.screen.currentAnnoListID, "resources": currentAnnoList};
                    var params = {"content":JSON.stringify(paramObj)};
                    tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio] = currentAnnoList;
                    $.post(url, params, function(data){
                        if (recurse){
                            tpen.screen.nextColumnToRemove.remove();
                            // FIXME: I cannot find this object always?
                            destroyPage();
                        }
                        else{
                            cleanupTranscriptlets(true);
                            tpen.screen.nextColumnToRemove.remove();
                            $("#parsingCover").hide();
                        }
                    });
                }
            }
    }
    else {
        //It was not a part of the list, but we can still cleanup the transcriptlets from the interface. This could happen when a object is fed to the
        //transcription textarea who instead of using an annotation list used the resources[] field to store anno objects directly with the canvas.
        //These changes will not save, they are purely UI manipulation.  An improper, view only object has been fed to the interface at this point, so this is intentional.
        for (var l = lines.length - 1; l >= 0; l--){
            var theLine = $(lines[l]);
            theLine.remove();
            var lineID = theLine.attr("lineserverid");
            $(".transcriptlet[lineserverid='" + lineID + "']").remove(); //remove the transcriptlet
            $(".lineColIndicator[lineserverid='" + lineID + "']").remove(); //Remove the line representing the transcriptlet
            $(".previewLineNumber[lineserverid='" + lineID + "']").parent().remove(); //Remove the line in text preview of transcription.
            $("#parsingCover").hide()
        }
    }
}

/* Re draw transcriptlets from the Annotation List information. */
function cleanupTranscriptlets(draw) {
    var transcriptlets = $(".transcriptlet");
    if (draw){
        transcriptlets.remove();
        $(".lineColIndicatorArea").children(".lineColIndicator").remove();
        $("#parsingSplit").find('.fullScreenTrans').unbind(); // QUESTION: Why is this happening? cubap
        $("#parsingSplit").find('.fullScreenTrans').bind("click", function(){
            fullPage();
            drawLinesToCanvas(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], "");
        });
    }
}

/* Make some invalid information inside of folios valid empties */
function scrubFolios(){
    //you could even force create anno lists off of the existing resource here if you would like.
    var cnt1 = - 1;
    $.each(tpen.manifest.sequences[0].canvases, function(){
        cnt1++;
        var canvasObj = this;
        if (canvasObj.resources && canvasObj.resources.length > 0){
            if (canvasObj.images === undefined || canvasObj.images === null){
                canvasObj.images = [];
            }
            var cnt2 = - 1;
            $.each(canvasObj.resources, function(){
                cnt2 += 1;
                if (this.resource && this.resource["@type"] && this.resource["@type"] === "dctypes:Image"){
                    canvasObj.images.push(this);
                    canvasObj.resources.splice(cnt2, 1);
                    tpen.manifest.sequences[0].canvases[cnt1] = canvasObj;
                }
            });
        }
        if (canvasObj.otherContent === undefined){
            tpen.manifest.sequences[0].canvases[cnt1].otherContent = [];
        }
    });
}



/*
 * Load all included Iframes on the page.  This function should be strategically placed so that the Iframes load after user and project information
 * are gathered.  This should help avoid timeouts caused by embedded Iframes wait times mixed with many calls to the annotation store and calls for images.
 * See the Network console in the Browser deveoper tools for problems with wait times on embedded content.
 *
 * @see newberryTrans.html to find the iframe elements.
 */
function loadIframes(){
    $.each($("iframe"), function(){
        var src = $(this).attr("data_src");
        $(this).attr("src", src);
    });
}

function toggleImgTools(event){
    var locationX = event.pageX;
    var locationY = event.pageY;
    $("#imageTools").css({
        "display":  "block",
        "left" : locationX + "px",
        "top" : locationY + 15 + "px"
    });
    $("#imageTools").draggable();
}

function toggleLineControls(event){
    var locationX = event.pageX;
    var locationY = event.pageY;
    $("#lineColControls").css({
        "display":  "block",
        "left" : locationX + "px",
        "top" : locationY + 15 + "px"
    });
    $("#lineColControls").draggable();
}

function toggleXMLTags(event){
    $("#xmlTagFloat").fadeToggle();
    $("#toggleXML").toggleClass('xmlTagged');
}

function toggleSpecialChars(event){
    $("#specialCharsFloat").fadeToggle();
    $("#toggleChars").toggleClass('specialCharactered');
}

/* Control the hiding and showing of the image tools in the transcription interface. Depricated
function toggleImgTools(){
    if ($("#imageTools").attr("class") !== undefined && $("#imageTools").attr("class").indexOf("activeTools") > - 1){
        $('.toolWrap').hide();
        $("#imageTools").removeClass("activeTools");
        $("#activeImageTool").children("i").css("transform", "rotate(180deg)");
    }
    else{
        $("#imageTools").addClass("activeTools");
        $('.toolWrap').show();
        $("#activeImageTool").children("i").css("transform", "rotate(0deg)");
    }
}
*/


/* Allows users to slightly adjust a line within a column while within the transcription interface. */
function bumpLine(direction, activeLine){
    //values are in pixel, not percentage.
    var id = activeLine.attr("lineserverid");
    if(direction === "left"){
        var currentLineLeft = activeLine.css("left");
        var currentLineLeftPerc = (parseFloat(currentLineLeft) / $("#imgTop").width()) * 100;
        if (currentLineLeftPerc > .3){
            currentLineLeftPerc -= .3;
        }
        else{ //no negative left value
            currentLineLeftPerc = 0.0;
        }
       currentLineLeft = "%"+currentLineLeftPerc;
    }
    else if (direction === "right"){
        var currentLineLeft = activeLine.css("left");
        var currentLineLeftPerc = (parseFloat(currentLineLeft) / $("#imgTop").width()) * 100;
        if (currentLineLeftPerc < 99.7){ //no left values greater than 100
            currentLineLeftPerc += .3;
        }
        else{
            currentLineLeftPerc = 100.0;
        }
       currentLineLeft = "%"+currentLineLeftPerc;
    }
    var currentLineLeftPX = parseFloat(currentLineLeftPerc/100) * $("#imgTop").width() + "px";
    $(".transcriptlet[lineserverid='"+id+"']").attr("lineleft", currentLineLeftPerc);
    activeLine.css("left", currentLineLeftPX);
    updateLine($(".transcriptlet[lineserverid='"+id+"']"), false, true);
}


    //UI effects for when a user decides to edit a line within the preview split tool.
    function edit(line){
        var focusLineID = $(line).siblings(".previewLineNumber").attr("lineserverid");
        var transcriptionText = ($(line).hasClass("previewText")) ? ".theText" : ".notes";
        var pair = $(".transcriptlet[lineserverid='"+focusLineID+"']").find(transcriptionText);
        var transcriptlet = $(".transcriptlet[lineserverid='"+focusLineID+"']");
        if ($(line).hasClass("currentPage")){
          if (pair.parent().attr('id') !== tpen.screen.focusItem[1].attr('id')){
              updatePresentation(transcriptlet);
          }
            line.focus();
            $(line).keyup(function(){
                //Data.makeUnsaved();
                pair.val($(this).text());
            });
        }
        else {
            //console.log("NOt the current page.")
        }
    }

    function scrollToCurrentPage(){
        var pageOffset = $(".previewPage").filter(":first").height() + 20;
        $("#previewDiv").animate({
            scrollTop:pageOffset
        },500);
        $("#previewNotes").filter(".ui-state-active").each( // pulled out #previewAnnotations
            function(){
                if ($("."+this.id).is(":hidden")){
                    $("."+this.id).show();
                    scrollToCurrentPage();
                }
            });
    }

    /*
     * Get the inline 'style' attribute of the transcription image containers and attach brightness or contrast filters to it.
     * The entire function is string manipulation and runs quickly.
     */
    function imageSlider(){
        var newFilter = "";
        if(navigator.userAgent.indexOf("Chrome") !== -1 ) { //also works with filter
          newFilter = "-webkit-filter:";
        }
        else if(navigator.userAgent.indexOf("Opera") !== -1 ) {
          newFilter = "-o-filter:";
        }
        else if(navigator.userAgent.indexOf("MSIE") !== -1 ) { //also works with filter
          newFilter= "-ms-filter:";
        }
        else if(navigator.userAgent.indexOf("Firefox") !== -1 ) { //-moz-filter does not work in more recent versions.  The newest version works with regular filter.
          newFilter = "filter:";
        }
        else {
            //Uncomment this code to alert the user that their browser does not support these CSS3 Filter tools.

//          alert("This tool is not supported by your browser.  The supported browsers are:\n\n\
//                Google Chrome\n Microsoft Internet Explorer\nOpera\nLatest version of Firefox");
//          return false;
        }
        var imgTop = document.getElementById("imgTop");
        var imgBtm = document.getElementById("imgBottom");
        var currentStyleTop = imgTop.getAttribute("style");
        var currentStyleBtm = imgBtm.getAttribute("style"); //null if there is no inline style (this happens)
        if (currentStyleTop === "null" || currentStyleTop === null) currentStyleTop = ""; //in case there is no inline style becase that returns null
        if (currentStyleBtm === "null" || currentStyleBtm === null) currentStyleBtm = ""; //in case there is no inline style because that returns null
        var alteredStyleTop = "";
        var alteredStyleBottom = "";
        var pieceToRemoveTop = "";
        var pieceToRemoveBtm = "";
        //Account for the different ways filter can be represented and alter it accordingly
        if(currentStyleTop.indexOf("-webkit-filter") >= 0){ //Chrome
          //Remove current filter string from the style attribute
          pieceToRemoveTop = currentStyleTop.substring(currentStyleTop.indexOf("-webkit-filter"), currentStyleTop.lastIndexOf(";") + 1);
          pieceToRemoveBtm = currentStyleBtm.substring(currentStyleBtm.indexOf("-webkit-filter"), currentStyleBtm.lastIndexOf(";") + 1);

          //Put the pieces of the filter together
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop.replace(pieceToRemoveTop, "") + newFilter;
          alteredStyleBottom = currentStyleBtm.replace(pieceToRemoveBtm, "") + newFilter;
        }
        else if(currentStyleTop.indexOf("-ms-filter") >= 0){ //microsoft browsers
          pieceToRemoveTop = currentStyleTop.substring(currentStyleTop.indexOf("-ms-filter"), currentStyleTop.lastIndexOf(";") + 1);
          pieceToRemoveBtm = currentStyleBtm.substring(currentStyleBtm.indexOf("-ms-filter"), currentStyleBtm.lastIndexOf(";") + 1);
          //Put the pieces of the filter together
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop.replace(pieceToRemoveTop, "") + newFilter;
          alteredStyleBottom = currentStyleBtm.replace(pieceToRemoveBtm, "") + newFilter;
        }
        else if(currentStyleTop.indexOf("-o-filter") >= 0){ //Opera
          //Remove current filter string from the style attribute
          pieceToRemoveTop = currentStyleTop.substring(currentStyleTop.indexOf("-o-filter"), currentStyleTop.lastIndexOf(";") + 1);
          pieceToRemoveBtm = currentStyleBtm.substring(currentStyleBtm.indexOf("-o-filter"), currentStyleBtm.lastIndexOf(";") + 1);
          //Put the pieces of the filter together
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop.replace(pieceToRemoveTop, "") + newFilter;
          alteredStyleBottom = currentStyleBtm.replace(pieceToRemoveBtm, "") + newFilter;
        }
        else if(currentStyleTop.indexOf("filter") >= 0){ //Works with firefox, IE and Chrome, but we specifically set prefixes at the beginning of the function.
          //Remove current filter string from the style attribute
          pieceToRemoveTop = currentStyleTop.substring(currentStyleTop.indexOf("filter"), currentStyleTop.lastIndexOf(";") + 1);
          pieceToRemoveBtm = currentStyleBtm.substring(currentStyleBtm.indexOf("filter"), currentStyleBtm.lastIndexOf(";") + 1);
          //Put the pieces of the filter together
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop.replace(pieceToRemoveTop, "") + newFilter;
          alteredStyleBottom = currentStyleBtm.replace(pieceToRemoveBtm, "") + newFilter;
        }
        else{ //First time the filter is being added.  The prefix is already a part of newFilter, so we just need to add the rest of the string.
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop + " "+newFilter;
          alteredStyleBottom = currentStyleBtm +" "+newFilter;
        }
        imgTop.setAttribute("style",alteredStyleTop); //set the style attribute with the appropriate filter string attached to it.
        imgBtm.setAttribute("style",alteredStyleBottom); //set the style attribute with the appropriate filter string attached to it.
    }

    /* Toggle grayscale and invert image CSS filters.v   */
    function toggleFilter(which){
        /*
         * The grayscale/invert toggle classes CANNOT BE DEFINED as the same object being given the brightness/contrast filters or they ALL BREAK
         */
        var filterObjectTop = document.getElementsByClassName("transcriptionImage")[0];
        var filterObjectBottom = document.getElementsByClassName("transcriptionImage")[1];
        var thisFilter = which+"Filter";
        if(filterObjectTop.className.indexOf(thisFilter) >= 0){
          filterObjectTop.className = filterObjectTop.className.replace(thisFilter, '');
          filterObjectBottom.className = filterObjectBottom.className.replace(thisFilter, '');
          $("button[which='"+which+"']").removeClass("selected");
        }
        else{
          filterObjectTop.className = filterObjectTop.className+=" "+thisFilter;
          filterObjectBottom.className = filterObjectBottom.className+=" "+thisFilter;
          $("button[which='"+which+"']").addClass("selected");
        }
    }

    //Make sure the value entered into the area that allows a user to define a custom ruler color is a valida color string.
    function validTextColour(stringToTest) {
        //Alter the following conditions according to your need.
        if (stringToTest === "") { return false; }
        if (stringToTest === "inherit") { return false; }
        if (stringToTest === "transparent") { return true; }

        var image = document.createElement("img");
        image.style.color = "rgb(0, 0, 0)";
        image.style.color = stringToTest;
        if (image.style.color !== "rgb(0, 0, 0)") { return true; }
        image.style.color = "rgb(255, 255, 255)";
        image.style.color = stringToTest;
        return image.style.color !== "rgb(255, 255, 255)";
    }

    //Change the ruler color.
    function rulerColor(color){
        if(color==="custom"){
            color=$("#customRuler").val();
            if(validTextColor(color)){

            }
            else{
                color = "red";
            }

        }
        $("#ruler1").css("color", color).css("background", color);
        $("#ruler2").css("color", color).css("background", color);
        $("#sampleRuler").css("color", color).css("background", color);
    }

    //Turn the ruler on
    function applyRuler(line){
            //var sRCbkp = selectRulerColor; //select Ruler Color backup
            $("#imageTip").html("Add a Line");
            if(!tpen.screen.isAddingLines){
                if (line.attr("lineleft") == line.next("div").attr("lineleft")) {
                    line.next("div").addClass('deletable');
                }
                line.addClass('deletable');
                if($(".deletable").size()>1){
                    $(".deletable").addClass("mergeable");
                    $("#imageTip").html("Merge Line");
                } else {
                    $("#imageTip").html("Delete Line");
                }
               //sRCbkp = 'transparent';
            }
            line.css('cursor','crosshair').bind('mousemove', function(e){
                var myLeft = line.position().left;
                var myWidth = line.width();
                $('#imageTip').show().css({
                    left:e.pageX,
                    top:e.pageY+20
                });
                $('#ruler1').show().css({
                    left: myLeft,
                    top: e.pageY,
                    height:'1px',
                    width:e.pageX-myLeft-7,
                    //background:"red"
                });
                $('#ruler2').show().css({
                    left: e.pageX+7,
                    top: e.pageY,
                    width:myWidth+myLeft-e.pageX-7,
                    height:'1px',
                   // background:"red"
                });
            });

    }
    /**
     * Hides ruler within parsing tool. Called on mouseleave .parsing.
     */
    function removeRuler(line){
        if(!tpen.screen.isAddingLines){$(".deletable").removeClass('deletable mergeable');}
        //line.unbind('mousemove');
        $('#imageTip').hide();
        $('#ruler1').hide();
        $('#ruler2').hide();
    }

    //Triggered when a user alters a line to either create a new one or destroy one.
    function lineChange(e,event){
        $("#parsingCover").show();
        if(tpen.screen.isAddingLines){
            splitLine(e,event);
        }
        else{
            //merge the line you clicked with the line below.  Delete the line below and grow this line by that lines height.
            removeLine(e);
        }

    }

function getURLVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}

function replaceURLVariable(variable, value){
       var query = window.location.search.substring(1);
       var location = window.location.origin + window.location.pathname;
       var vars = query.split("&");
       var variables = "";
       for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if(pair[0] == variable){
            var newVar = pair[0]+"="+value;
            vars[i] = newVar;
            break;
        }
       }
       variables = vars.toString();
       variables = variables.replace(",", "&");
       return(location + "?"+variables);
}

var Data = {
    /* Save all lines on the canvas */
    saveTranscription:function(relocate){
        var linesAsJSONArray = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false);
        batchLineUpdate(linesAsJSONArray, relocate);
    }
}


var Linebreak = {
    /**
     * Inserts uploaded linebreaking text into the active textarea.
     * Clears all textareas following location of inserted text.
     * Used within T&#8209;PEN linebreaking tool.
     */
    useText: function(){
        var isMember = (function(uid){
            for(var i=0;i<tpen.project.user_list.length;i++){
                if(tpen.project.user_list[i].UID==uid){
                    return true;
                }
            }
            return false;
        })(tpen.user.UID);
        if(!isMember && !tpen.project.permissions.allow_public_modify)return false;
        //Load all text into the focused on line and clear it from all others
        var cfrm = confirm("This will insert the text at the current location and clear all the following lines for linebreaking.\n\nOkay to continue?");
        if (cfrm){
            tpen.screen.focusItem[1].find(".theText").val($("<div/>").html(tpen.project.remainingText).text()).focus()
            .parent().addClass("isUnsaved")
            .nextAll(".transcriptlet").addClass("isUnsaved")
                .find(".theText").html("");
            Data.saveTranscription("");
            Preview.updateLine(tpen.screen.focusItem[1].find(".theText")[0]);
        }
    },
    /**
     * Inserts uploaded linebreaking text beginning in the active textarea.
     * Automatically breaks at each occurance of linebreakString.
     * Used within T&#8209;PEN linebreaking tool.
    */
    useLinebreakText: function(){
        var isMember = (function(uid){
            for(var i=0;i<tpen.project.user_list.length;i++){
                if(tpen.project.user_list[i].UID==uid){
                    return true;
                }
            }
            return false;
        })(tpen.user.UID);
        if(!isMember && !tpen.project.permissions.allow_public_modify)return false;
        var cfrm = confirm("This will insert the text at the current location and replace all the following lines automatically.\n\nOkay to continue?");
        if (cfrm){
            var bTlength = tpen.screen.brokenText.length;
            var thoseFollowing = tpen.screen.focusItem[1].nextAll(".transcriptlet").find(".theText");
            tpen.screen.focusItem[1].find('.theText').add(thoseFollowing).each(function(index){
                if(index < bTlength){
                    if (index < bTlength-1 ) tpen.screen.brokenText[index] += tpen.screen.linebreakString;
                    $(this).val(unescape(tpen.screen.brokenText[index])).parent(".transcriptlet").addClass("isUnsaved");
                    Preview.updateLine(this);
                    if (index == thoseFollowing.length) {
                        tpen.project.remainingText = tpen.screen.brokenText.slice(index+1).join(tpen.screen.linebreakString);
                        $("#lbText").text(unescape(tpen.project.remainingText));
                    }
                }
            });
            Data.saveTranscription("");
        }
    },
    /**
     * Saves all textarea values on the entire page.
     *
     * @see Data.saveTranscription()
     */
    saveWholePage: function(){
        var isMember = (function(uid){
            for(var i=0;i<tpen.project.user_list.length;i++){
                if(tpen.project.user_list[i].UID==uid){
                    return true;
                }
            }
            return false;
        })(tpen.user.UID);
        if(!isMember && !tpen.project.permissions.allow_public_modify)return false;
        $(".transcriptlet").addClass(".isUnsaved");
        Data.saveTranscription("");
    },
    /**
     * Records remaining linebreaking text for later use.
     * POSTs to updateRemainingText servlet.
     *
     * @param leftovers text to record
     */
    saveLeftovers: function(leftovers){
        var isMember = (function(uid){
            for(var i=0;i<tpen.project.user_list.length;i++){
                if(tpen.project.user_list[i].UID==uid){
                    return true;
                }
            }
            return false;
        })(tpen.user.UID);
        if(!isMember && !tpen.project.permissions.allow_public_modify)return false;
        $('#savedChanges').html('Saving . . .').stop(true,true).css({
            "opacity" : 0,
            "top"     : "35%"
        }).show().animate({
            "opacity" : 1,
            "top"     : "0%"
        },1000,"easeOutCirc");
        $.post("updateRemainingText", {
            transcriptionleftovers  : unescape(tpen.project.remainingText),
            projectID               : tpen.project.ID
        }, function(data){
            if(data=="success!"){
                $('#savedChanges')
                .html('<span class="left ui-icon ui-icon-check"></span>Linebreak text updated.')
                .delay(3000)
                .fadeOut(1500);
            } else {
                //successful POST, but not an appropriate response
                $('#savedChanges').html('<span class="left ui-icon ui-icon-alert"></span>Failed to save linebreak text.');
                alert("There was a problem saving your linebreaking progress, please check your work before continuing.");
            }
        }, 'html');
    },
    /**
     * Moves all text after the cursor to the following transcription textarea.
     * Asks to save value as linebreak remaining text if on the last line.
     *
     * @return false to prevent Interaction.keyhandler() from propogating
     */
    moveTextToNextBox: function() {
        var isMember = (function(uid){
            for(var i=0;i<tpen.project.user_list.length;i++){
                if(tpen.project.user_list[i].UID==uid){
                    return true;
                }
            }
            return false;
        })(tpen.user.UID);
        if(!isMember && !tpen.project.permissions.allow_public_modify)return false;
        var myfield = tpen.screen.focusItem[1].find(".theText")[0];
        tpen.screen.focusItem[1].addClass("isUnsaved");
        //IE support
        if (document.selection) {
            //FIXME this is not actual IE support
            myfield.focus();
            sel = document.selection.createRange();
        }
        //MOZILLA/NETSCAPE support
        else if (myfield.selectionStart || myfield.selectionStart == '0') {
            var startPos = myfield.selectionStart;
            if(!tpen.screen.focusItem[1].next().size() && myfield.value.substring(startPos).length > 0) {
            // if this is the last line, ask before proceeding
                var cfrm = confirm("You are on the last line of the page. T-PEN can save the remaining text in the linebreaking tool for later insertion. \n\nConfirm?");
                if (cfrm) {
                    tpen.project.remainingText = myfield.value.substring(startPos);
                    $("#lbText").text(tpen.project.remainingText);
                    myfield.value=myfield.value.substring(0, startPos);
                    Linebreak.saveLeftovers(escape(tpen.project.remainingText));
                } else {
                    return false;
                }
            } else {
                //prevent saving from changing focus until after values are changed
                var nextfield = tpen.screen.focusItem[1].next(".transcriptlet").find(".theText")[0];
                nextfield.value = myfield.value.substring(startPos)+nextfield.value;
                Preview.updateLine(nextfield);
                myfield.value = myfield.value.substring(0, startPos);
                Preview.updateLine(myfield);
                $(nextfield).parent(".transcriptlet").addClass("isUnsaved");
                tpen.screen.focusItem[1].find(".nextLine").click();
            }
        }
        Data.saveTranscription("");
        return false;
    }
};

    $("#linebreakStringBtn").click(function(event){
        if(event.target != this){return true;}
        if ($("#linebreakString").val().length > 0) {
            $("#useLinebreakText").fadeIn();
            tpen.screen.linebreakString = $("#linebreakString").val();
            tpen.screen.brokenText = $("<div/>").html(tpen.project.remainingText).text().split(tpen.screen.linebreakString);
            var btLength = tpen.screen.brokenText.length;
            $("#lbText").html(function(index,html){
                return html.split(unescape(tpen.screen.linebreakString)).join(decodeURI(tpen.screen.linebreakString)+"<br/>");
            });
        } else {
            alert("Please enter a string for linebreaking first.");
        }
        if (btLength > 1){
            $("#linesDetected").html("("+(btLength)+" lines detected)");
        } else {
            alert("Linebreak string was not found.");
        }
    });

var Help = {
    /**
     *  Shows the help interface.
     */
    revealHelp: function(){
        if($("#closeHelp").is(":visible")){
            $("#closeHelp:visible").click(); // close if open
            return false;
        }

        var workspaceHeight = $("#transWorkspace").height();
        var imgTopHeight = $("#imgTop").height() + workspaceHeight;
        //Screen.maintainWorkspace();
        $(".helpPanel").height(imgTopHeight);
        $(".helpPanel").css("width", "20%");
        $("#helpPanels").width('500%').height(imgTopHeight);
        $("#help").show().css({
            "left":"0px",
            "top":"32px",
            "width":"100%"
        });
        $(".helpContents").eq(0).click();
        $("#bookmark").hide();
        $("#closeHelp").show();
    },
    /**
     *  Adjusts the position of the help panels to reveal the selected section.
     */
    select  : function(contentSelect){
          $(contentSelect).addClass("helpActive").siblings().removeClass("helpActive");
          $("#helpPanels").css("margin-left",-$("#help").width()*contentSelect.index()+"px");
    },
    /**
     *  Shows specific page element through overlay and zooms in. If the element
     *  is not displayed on screen, an alternative message is shown.
     *
     *  @param refIndex int index of help button clicked
     */
    lightUp: function(refIndex){
        switch (refIndex){
            case 0  :   //Previous Line
                this.highlight($("#prevLine"));
                break;
            case 1  :   //Next Line
                this.highlight($("#nextLine"));
                break;
            case 2  :   //Line Indicator
                this.highlight($("#colLineWrapper"));
                break;
            case 3  :   //Special Characters
                this.highlight($("#toggleChars"));
                break;
            case 4  :   //XML Tags
                this.highlight($("#toggleXML"));
                break;
            case 6:
            case 8:
                this.highlight($("#magnify1"));
                break;
            case 10:
                this.highlight($("#parsingBtn"));
                break;
            case 5  :
            case 7  :
            case 9  :
            case 11 :
                this.highlight($("#splitScreenTools"));
                break;
            case 12 :   //Location Flag.
                this.highlight($("#trimPage")); //This is the jump to page
                break;
            case 13 : //Page Jump widget
                this.highlight($("#pageJump")); //This is the jump to page
                break;
            case 14 : //Previous Page button
                this.highlight($("#prevCanvas"));
                break;
            case 15 : //Next Page button
                this.highlight($("#nextCanvas"));
                break;
            default :
                console.warn("No element located for "+refIndex);
        }
    },
    /**
     *  Redraws the element on top of the overlay.
     *
     *  @param $element jQuery object to redraw
     */
    highlight: function($element){
        if ($element.length == 0) $element = $("<div/>");
        var look = $element.clone().attr('id','highlight');
        var position = $element.offset();
        $("#overlay").show().after(look);
        if ((position == null) || (position.top < 1)){
            position = {left:(Page.width()-260)/2,top:(Page.height()-46)/2};
            look.prepend("<div id='offscreen' class='ui-corner-all ui-state-error'>This element is not currently displayed.</div>")
            .css({
                "left"  : position.left,
                "top"   : position.top
            }).delay(2000).show("fade",0,function(){
                $(this).remove();
                $("#overlay").hide("fade",2000);
            });
        } else {
            $("#highlight").css({
                "box-shadow":"0 0 5px 3px whitesmoke",
                "left"  : position.left,
                "top"   : position.top,
                "z-index" : 10
            }).show("scale",{
                percent:150,
                direction:'both',
                easing:"easeOutExpo"},1000);

            $("#overlay").hide("fade",2000);
            setTimeout(function(){ $("#highlight").remove(); }, 1500);
        }
    },
    /**
     *  Help function to call up video, if available.
     *
     *  @param refIndex int index of help button clicked
     */
    video: function(refIndex){
        var vidLink ='';
        switch (refIndex){
            case 0  :   //Previous Line
            case 1  :   //Next Line
                vidLink = 'http://www.youtube.com/embed/gcDOP5XfiwM';
                break;
            case 2  :   //Line Indicator
                vidLink = 'http://www.youtube.com/embed/rIfF9ksffnU';
                break;
            case 3  :   //View Full Page
            case 7  :
                vidLink = 'http://www.youtube.com/embed/6X-KlLpF6RQ';
                break;
            case 4  :   //Preview Tool
            case 15 :
                vidLink = 'http://www.youtube.com/embed/dxS-BF3PJ_0';
                break;
            case 5  :   //Special Characters
                vidLink = 'http://www.youtube.com/embed/EJL_GRA-grA';
                break;
            case 6  :   //XML Tags
                vidLink = '';
                break;
            case 8  :   //Magnify Tool
                vidLink = '';
                break;
            case 9  :   //History
                vidLink = '';
                break;
            case 10 :   //Abbreviations
                vidLink = '';
                break;
            case 11 :   //Compare Pages
                vidLink = '';
                break;
            case 12 :   //Magnify Tool
                vidLink = '';
                break;
            case 13 :   //Linebreaking
                vidLink = '';
                break;
            case 14 :   //Correct Parsing
                vidLink = '';
                break;
            case 16 :   //Location Flag
                vidLink = 'http://www.youtube.com/embed/8D3drB9MTA8';
                break;
            case 17 :   //Jump to Page
                vidLink = 'http://www.youtube.com/embed/mv_W_3N_Sbo';
                break;
            case 18 :   //Previous Page
                vidLink = '';
                break;
            case 19 :   //Next Page
                vidLink = '';
                break;
            default :
                console.log("No element located for "+refIndex);
        }
        var videoview = $("<iframe id=videoView class=popover allowfullscreen src="+vidLink+" />");
        if (vidLink.length>0){
            $('#overlay').show().after(videoview);
        } else {
            $(".video[ref='"+refIndex+"']").addClass('ui-state-disabled').text('unavailable');
        }
    }
};

    /**
     * Adjusts font-size in transcription and notes fields based on size of screen.
     * Minimum is 13px and maximum is 18px.
     *
     */
    tpen.screen.textSize= function () {
           var wrapperWidth = $('#transcriptionCanvas').width();
        var textSize = Math.floor(wrapperWidth / 60),
            resize = (textSize > 18) ? 18 : textSize,
        resize = (resize < 13) ? 13 : resize;
        $(".theText,.notes,#previous span,#helpPanels ul").css("font-size",resize+"px");
//        if (wrapperWidth < 550) {
//            Interaction.shrinkButtons();
//        } else {
//            Interaction.expandButtons();
//        }
    };

    var Preview = {
    /**
     *  Syncs changes between the preview tool and the transcription area,
     *  if it is on the page. If it is the previous or following page, a button
     *  to save remotely is created and added.
     *
     *  @param line jQuery object, line edited in the preview tool
     */
    edit: function(line){
        if ($(line).hasClass("currentPage")){
            var focusLineNumber = $(line).siblings(".previewLineNumber").attr("data-linenumber");
            var focusFolio = $(line).parents(".previewPage").attr("data-pagenumber");
            var transcriptionText = ($(line).hasClass("previewText")) ? ".theText" : ".notes";
            var pair = $(".transcriptlet[lineid='"+focusLineNumber+"']").find(transcriptionText);
          if (pair.parent().attr('id') !== tpen.screen.focusItem[1].attr('id')) updatePresentation(pair.parent());
                line.focus();
            $(line).keyup(function(){
                // Data.makeUnsaved();
                pair.val($(this).text());
            });
        }
    },
    /**
     *  Saves the changes made in the preview tool on the previous or following
     *  page. Overwrites anything currently saved.
     *
     *  @param button element clicked (for removal after success)
     *  @param saveLineID int lineID of changed transcription object
     *  @param focusFolio int id of folio in which the line has been changed
     */
    remoteSave: function(button,saveLineID,focusFolio){
        if(!isMember && !permitModify)return false;
        var saveLine = $(".previewLineNumber[data-lineid='"+saveLineID+"']").parent(".previewLine");
        var saveText = saveLine.find(".previewText").text();
        var saveComment = saveLine.find(".previewNotes").text();
        Data.saveLine(saveText, saveComment, saveLineID, focusFolio);
        $(button).fadeOut();
    },
    /**
     *  Syncs the current line of transcription in the preview tool when changes
     *  are made in the main interface. Called on keyup in .theText and .notes.
     *
     *  @param current element textarea in which change is made.
     */
     updateLine: function(current) {
            var lineid = $(current).parent(".transcriptlet").attr("lineid");
            var previewText = ($(current).hasClass("theText")) ? ".previewText" : ".previewNotes";
            $(".previewLineNumber[data-linenumber='"+lineid+"']").siblings(previewText).html(Preview.scrub($(current).val()));
            // Data.makeUnsaved();
     },
    /**
     *  Rebuilds every line of the preview when changed by parsing.
     *
     */
    rebuild: function(){
        var allTrans = $(".transcriptlet");
        var columnValue = 65;
        var columnLineShift = 0;
        var oldLeftPreview = allTrans.eq(0).find(".lineLeft").val();
        // empty the current page
        var currentPreview = $("[data-pagenumber='"+folio+"']");
        currentPreview.find(".previewLine").remove();
        var newPage = new Array();
        allTrans.each(function(index){
            var columnLeft = $(this).find(".lineLeft").val();
            if (columnLeft > oldLeftPreview){
                columnValue++;
                columnLineShift = (index+1);
                oldLeftPreview = columnLeft;
            }
            newPage.push("<div class='previewLine' data-linenumber='",
                    (index+1),"'>",
                "<span class='previewLineNumber' data-lineid='",
                    $(this).attr("data-lineid"),"' data-linenumber='",
                    (index+1),"' data-linenumber='",
                    String.fromCharCode(columnValue),"' data-lineofcolumn='",
                    (index+1-columnLineShift),"'>",
                    String.fromCharCode(columnValue),(index+1-columnLineShift),
                    "</span>",
                "<span class='previewText currentPage' contenteditable=true>",
                    Preview.scrub($(this).find(".theText").val()),
                    "</span><span class='previewLinebreak'></span>",
                "<span class='previewNotes currentPage' contenteditable=true>",
                    Preview.scrub($(this).find(".notes").val()),"</span></div>");
        });
        currentPreview.find('.previewFolioNumber').after(newPage.join(""));
     },
    /**
     *  Cleans up the preview tool display.
     */
    format: function(){
        $(".previewText").each(function(){
            $(this).html(Preview.scrub($(this).text()));
        });
    },
    /**
     *  Analyzes the text in the preview tool to highlight the tags detected.
     *  Returns html of this text to Preview.format()
     *
     *  @param thisText String loaded in the current line of the preview tool
     */
    scrub: function(thisText){
        var workingText = $("<div/>").text(thisText).html();
        var encodedText = [workingText];
        if (workingText.indexOf("&gt;")>-1){
            var open = workingText.indexOf("&lt;");
            var beginTags = new Array();
            var endTags = new Array();
            var i = 0;
            while (open > -1){
                beginTags[i] = open;
                var close = workingText.indexOf("&gt;",beginTags[i]);
                if (close > -1){
                    endTags[i] = (close+4);
                } else {
                    beginTags[0] = null;
                    break;}
                open = workingText.indexOf("&lt;",endTags[i]);
                i++;
            }
            //use endTags because it might be 1 shorter than beginTags
            var oeLen = endTags.length;
            encodedText = [workingText.substring(0, beginTags[0])];
            for (i=0;i<oeLen;i++){
                encodedText.push("<span class='previewTag'>",
                    workingText.substring(beginTags[i], endTags[i]),
                    "</span>");
                if (i!=oeLen-1){
                    encodedText.push(workingText.substring(endTags[i], beginTags[i+1]));
            }
            }
        if(oeLen>0)encodedText.push(workingText.substring(endTags[oeLen-1]));
        }
        return encodedText.join("");
    },
    /**
     *  Animates scrolling to the current page (middle of 3 shown)
     *  in the Preview Tool. Also restores the intention of the selected options.
     */
    scrollToCurrentPage: function(){
        var pageOffset = $(".previewPage").filter(":first").height() + 20;
        $("#previewDiv").animate({
            scrollTop:pageOffset
        },500);
        $("#previewNotes").filter(".ui-state-active").each( // pulled out #previewAnnotations
            function(){
                if ($("."+this.id).is(":hidden")){
                    $("."+this.id).show();
                    Preview.scrollToCurrentPage();
                }
            });
    }
};
    $("#previewSplit")
        .on("click",".previewText,.previewNotes",function(){Preview.edit(this);})
        .on("click","#previewNotes",function(){
            if($(this).hasClass("ui-state-active")){
                $(".previewNotes").hide();
                $("#previewNotes")
                    .text("Show Notes")
                    .removeClass("ui-state-active");
            } else {
                $(".previewNotes").show();
                $("#previewNotes")
                    .text("Hide Notes")
                    .addClass("ui-state-active");
            }
            Preview.scrollToCurrentPage();
        });
tpen.screen.peekZoom = function(cancel){
        var topImg = $("#imgTop img");
        var btmImg = $("#imgBottom img");
        var imgSrc = topImg.attr("src");
        if(imgSrc.indexOf("imageResize?">-1 && imgSrc.indexOf("height=1000")>-1)){
    imgSrc=imgSrc.replace("height=1000","height=2000");
    }
        if (imgSrc.indexOf("quality") === -1) {
            imgSrc += "&quality=100";
            topImg.add(btmImg).attr("src",imgSrc);
        }
        var WRAPWIDTH = $("#transcriptionCanvas").width();
        var availableRoom = new Array (Page.height(),WRAPWIDTH);
        var line = $(".activeLine");
        var limitIndex = (line.width()/line.height()> availableRoom[1]/availableRoom[0]) ? 1 : 0;
        var zoomRatio = (limitIndex === 1) ? availableRoom[1]/line.width() : availableRoom[0]/line.height();
        var imgDims = new Array (topImg.height(),topImg.width(),parseInt(topImg.css("left")),-line.position().top);
        if (!cancel){
            //zoom in
            $(".lineColIndicatorArea").fadeOut();
            tpen.screen.peekMemory = [parseInt(topImg.css("top")),parseInt(btmImg.css("top")),$("#imgTop").height()];
            $("#imgTop").css({
                "height"    : line.height() * zoomRatio + "px"
            });
            topImg.css({
                "width"     : imgDims[1] * zoomRatio + "px",
                "left"      : -line.position().left * zoomRatio,
                "top"       : imgDims[3] * zoomRatio,
                "max-width" : imgDims[1] * zoomRatio / WRAPWIDTH * 100 + "%"
            });
            btmImg.css({
                "left"      : -line.position().left * zoomRatio,
                "top"       : (imgDims[3]-line.height()) * zoomRatio,
                "width"     : imgDims[1] * zoomRatio + "px",
                "max-width" : imgDims[1] * zoomRatio / WRAPWIDTH * 100 + "%"
            });
            tpen.screen.isPeeking = true;
        } else {
            //zoom out
            topImg.css({
                "width"     : "100%",
                "left"      : 0,
                "top"       : tpen.screen.peekMemory[0],
                "max-width" : "100%"
            });
            btmImg.css({
                "width"     : "100%",
                "left"      : 0,
                "top"       : tpen.screen.peekMemory[1],
                "max-width" : "100%"
            });
            $("#imgTop").css({
                "height"    : tpen.screen.peekMemory[2]
            });
            $(".lineColIndicatorArea").fadeIn();
            tpen.screen.isPeeking = false;
        }
    };

    /* Clear the resize function attached to the window element. */
    function detachWindowResize(){
        console.log("window resize detached");
        window.onresize = function(event, ui){
            console.log("detach");
        };
    }

    //Must explicitly set new height and width for percentages values in the DOM to take effect.
    //FIXME: Does not handle resizing the split area correctly except for in parsing interface.
    //FIXME: If you look at project 4080, you will notice that sometimes the annotation will slip off screen
    //FIXME: Gets in the way of transcriptionTemplate resizing.
    //with resizing because the img top position puts it up off screen a little.
    function attachWindowResize(){
        console.log("window resize attached");
        window.onresize = function(event, ui) {
            console.log("window resize detected.  "+tpen.screen.liveTool+" is active tool.");
            var newImgBtmTop = "0px";
            var newImgTopTop = "0px";
    //        if(tpen.screen.liveTool === "controls"){ //the width is different for this one
    //
    //        }
            if(tpen.screen.liveTool === 'parsing'){ //apply to all split tools?
                console.log("Tool active, resize, parsing.");
                var ratio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
                var newCanvasWidth = tpen.screen.originalCanvasWidth * .57;
                //Can I use tpen.screen.originalCanvasWidth?
                var newCanvasHeight = 1 / ratio * newCanvasWidth;
                var PAGEHEIGHT = Page.height();
                if (newCanvasHeight > PAGEHEIGHT){
                    newCanvasHeight = PAGEHEIGHT;
                    newCanvasWidth = 1/ratio*newCanvasHeight;
                }
                var splitWidth = Page.width() - ($("#transcriptionTemplate").width()+35) + "px";
                $(".split img").css("max-width", splitWidth);
                $(".split:visible").css("width", splitWidth);
                $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
                newImgTopTop = tpen.screen.imgTopPositionRatio * newCanvasHeight;
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("height", newCanvasHeight + "px");
                $("#imgTop img").css({
                    'height': newCanvasHeight + "px",
                    'top': "0px"
                });
                $("#imgTop").css("height", newCanvasHeight + "px");
                $("#imgTop").css("width", newCanvasWidth + "px");

            }
            else if(tpen.screen.liveTool !== "" && tpen.screen.liveTool!=="none"){
                console.log("Tool active, resize found, not parsing.");
                var ratio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
                var newCanvasWidth = Page.width() * .55;
                var splitWidth = window.innerWidth - (newCanvasWidth + 35) + "px";
                if(tpen.screen.liveTool === "controls"){
                    newCanvasWidth = Page.width()-200;
                    splitWidth = 200;
                }
                //Can I use tpen.screen.originalCanvasWidth?
                var newCanvasHeight = 1 / ratio * newCanvasWidth;
//                var PAGEHEIGHT = Page.height();
//                if (newCanvasHeight > PAGEHEIGHT){
//                    newCanvasHeight = PAGEHEIGHT;
//                    newCanvasWidth = ratio*newCanvasHeight;
//                }
                console.log("W, h, sw "+newCanvasWidth, newCanvasHeight, splitWidth);
                $(".split img").css("max-width", splitWidth);
                $(".split:visible").css("width", splitWidth);
                $("#transcriptionTemplate").css("width", newCanvasWidth + "px");
                $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
                $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
                newImgTopTop = tpen.screen.imgTopPositionRatio * newCanvasHeight;
                $("#imgTop img").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
                $("#imgBottom img").css("top", newImgBtmTop + "px");
                $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
                $(".lineColIndicatorArea").css("height",newCanvasHeight+"px");
//                if(tpen.screen.liveTool === "parsing"){
//                    $("#imgTop img").css({
//                    'height': height + "px"
//        //                'width': $("#imgTop img").width()
//                    });
//                    $("#imgTop").css({
//                        'height': $("#imgTop img").height(),
//                        'width': tpen.screen.imgTopSizeRatio * $("#imgTop img").height() + "px"
//                    });
//                }
            }
            else{
                var newHeight = $("#imgTop img").height();
                newImgBtmTop = tpen.screen.imgBottomPositionRatio * newHeight;
                newImgTopTop = tpen.screen.imgTopPositionRatio * newHeight;
                $("#imgBottom img").css("top", newImgBtmTop + "px");
                $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
                $("#imgTop img").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
                $("#transcriptionCanvas").css("height",newHeight+"px");
                $(".lineColIndicatorArea").css("height",newHeight+"px");
            }
            $.each($(".lineColOnLine"),function(){
                $(this).css("line-height", $(this).height()+"px");
            });
            tpen.screen.textSize();
        };
    }

    /*
     * I believe index.jsp makes a href='javascript:createProject(msID);' call through the links for Start Transcribing.
     * This is the javascript fuction that it tries to call, with the redirect to handle success and an alert for failure.
     * */
    function createProject(msID){
        var url = "createProject";
        var params = {ms:msID};
        var projectID = 0;
        $.post(url, params)
        .success(function(data){
            projectID = data;
            window.location.href = "transcription.html?projectID="+projectID;
        })
        .fail(function(data){
            alert("Could not create project");
        });

    }


// Shim console.log to avoid blowing up browsers without it - daQuoi?
if (!window.console) window.console = {};
    if (!window.console.log) window.console.log = function () { };
