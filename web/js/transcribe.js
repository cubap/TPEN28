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
        folioImages: [],
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
        isPeeking: false,
        isMoving: false,
        toggleMove: false,
        //colorList:["rgba(255,255,255,.4)","rgba(0,0,0,.4)","rgba(255,0,0,.4)","rgba(153,255,0,.4)", "rgba(0,255,204,.4)", "rgba(51,0,204,.4)", "rgba(204,255,0,.4)"],
        //colorThisTime: "rgba(255,255,255,.4)",
        colorList: ["white", "black","lime","magenta","#A64129"],
        colorThisTime: "white",
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
        originalCanvasWidth: 1, //The canvas width when initially loaded into the transcrtiption interface.
        mode: "LTR"
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
 * Make sure all image tools reset to their default values.
*/
function resetImageTools(newPage){
    $("#brightnessSlider").slider("value", "100");
    $("#contrastSlider").slider("value", "100");
    if($("button[which='grayscale']").hasClass("selected")){
            toggleFilter("grayscale");
        }
    if($("button[which='invert']").hasClass("selected")){
        toggleFilter("invert");
    }
    if($("#showTheLines").hasClass("selected")){
        toggleLineMarkers();
    }
    if(!$("#showTheLabels").hasClass("selected")){
        toggleLineCol();
    }
    
}

/**
 * Redraw the screen for use after updating the current line, folio, or
 * tools being used. Expects all screen variables to be set.
 *
 * @return {undefined}
*/
function redraw(parsing) {
    tpen.screen.focusItem = [null, null];
    var canvas = tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio];
    if (tpen.screen.currentFolio > - 1) {
        if (parsing === "parsing" || tpen.screen.liveTool === "parsing") {
            $(".pageTurnCover").show();
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
    $(window).trigger("resize");
}

/* Load the interface to the first page of the manifest. */
function firstFolio () {
    //By updating the active line, we have GUARANTEED everything is saved.  No batch update necessary.
    tpen.screen.currentFolio = 0;
    var activeLineID = $(".activeLine").attr("lineid");
    var transcriptlet = $("#transcriptlet_"+activeLineID);
    updateLine(transcriptlet, false, false);
    redraw("");
}

/* Load the interface to the last page of the manifest. */
function lastFolio(){
    //By updating the active line, we have GUARANTEED everything is saved.  No batch update necessary.
    tpen.screen.currentFolio = tpen.manifest.sequences[0].canvases.length - 1;
    var activeLineID = $(".activeLine").attr("lineid");
    var transcriptlet = $("#transcriptlet_"+activeLineID);
    updateLine(transcriptlet, false, false);
    redraw("");
}
/* Load the interface to the previous page from the one you are on. */
function previousFolio (parsing) {
    if (tpen.screen.currentFolio === 0) {
        throw new Error("You are already on the first page.");
    }
    //By updating the active line, we have GUARANTEED everything is saved.  No batch update necessary.
    var activeLineID = $(".activeLine").attr("lineid");
    var transcriptlet = $("#transcriptlet_"+activeLineID);
    updateLine(transcriptlet, false, false);
    tpen.screen.currentFolio--;
    redraw(parsing);
}

/* Load the interface to the next page from the one you are on. */
function nextFolio(parsing) {
    //By updating the active line, we have GUARANTEED everything is saved.  No batch update necessary.
    if (tpen.screen.currentFolio >= tpen.manifest.sequences[0].canvases.length - 1) {
        throw new Error("That page is beyond the last page.");
    }
    var activeLineID = $(".activeLine").attr("lineid");
    var transcriptlet = $("#transcriptlet_"+activeLineID);
    updateLine(transcriptlet, false, false);
    tpen.screen.currentFolio++;
    redraw(parsing);
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
                // Need to make sure the race condition of the lines being RTL in dereferencedList is beat here, or popluatePreview will be wonky.  
                var listOfAnnos = getList(tpen.manifest.sequences[0].canvases[i], false, false, i);
                if(tpen.screen.mode === "RTL"){
                    listOfAnnos = reorderLinesForRTL(listOfAnnos, tpen.screen.liveTool, true);
                }
                makePreviewPage(listOfAnnos, pageLabel, currentPage, i);
            }
            else{
                console.warn("otherContent was null or empty, passing an empty array of lines");
                populatePreview([], pageLabel, currentPage, i);
            }
        }

}

function makePreviewPage(thisList, pageLabel, currentPage, i, RTL){
    populatePreview(thisList, pageLabel, currentPage, i, RTL);
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
    var RTL = false;
    if(tpen.screen.mode === "RTL"){
        RTL = true;
    }
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
        var lineID = line["tpen_line_id"];
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
                num = 1;
                col = letters[letterIndex];
                if(RTL){ //we need to reset the counters a bit differently...
                    num = 1;
                    //col = letters[letterIndex];
                }
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
    setDirectionForElements();
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

function populateSpecialCharacters(){
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
                //speCharactersInOrder[position2 - 1] = newCharacter;
                speCharactersInOrder[char] = newCharacter;
            }
            else{
                speCharactersInOrder[char] = newCharacter;
                //Something is wrong with the position value, do your best.
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
            for(var i=0; i<tpen.project.folios.length; i++){
                var preloadObj = {
                    "preloaded" : false,
                    "folioNum" : tpen.project.folios[i].folioNumber,
                    "image" : null
                };
                tpen.project.folioImages[i] = preloadObj;
            }
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
    $.each(tpen.project.user_list, function(){
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
            setTranscribingUser();
            return false;
            //tpen.user.UID = parseInt(this.UID);
        }
        if(count == length){ //we did not find this user in the list of project users.
            console.warn("Not a user of this project.");
        }
    });
    $.each(tpen.project.leaders, function(){
        count++;
        if (this.UID === parseInt(data.cuser)){
            tpen.user.isAdmin = true;
            return false;
        }
        if(count == length){ //we did not find this user in the list of leaders.
            console.warn("Not an admin");
        }
    });
}
/* Set the current transcribing user in the appropriate HTML elements.  Right now, it is first name, last name */
function setTranscribingUser(){
    var user = "";
    if(!tpen.user.fname){
        user += "? ";
    }
    else{
        user += tpen.user.fname+" ";
    }
    if(!tpen.user.lname){
        user += "?";
    }
    else{
        user += tpen.user.lname;
    }
    $("#trimCurrentUser").html(user);
    $("#trimCurrentUser").attr("title",user);
    $("#ipr_user").html(user);
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
    $("#projectsBtn").attr("href", "project.jsp?projectID="+pid);
    $("#transTemplateLoading").show();
if (pid.indexOf("http://") >= 0 || pid.indexOf("https://") >= 0) {
        var url = pid;
        tpen.project.id = -1; //This means it is not a T-PEN project, but rather a manifest from another source.
        $.ajax({
            url: url,
            datatype: 'jsonp',
            crossDomain: true,
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
            },
            error: function(jqXHR, error, errorThrown) {
                if (jqXHR.status && jqXHR.status > 400){
                    alert(jqXHR.responseText);
                }
                else {
                    throw error;
                }
        }
        });
    }
    else {
        throw new Error("The input was invalid.");
    }
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
 * Checks the TPEN28 object for the manuscript permissions from a specific folio.  If this user has not accepted the
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
 * Checks the TPEN28 object for the IPR agreement from a specific folio.  If this user has not accepted the
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
/**
 * Look for the line to start on.
 * If none, suggest parsing; if *xxxxxx first x; else last modifed.
 * @returns undefined
 */
function focusOnLastModified(){
    var lines = tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources;
    var focusOn = lines[0];
    var scribedLines = lines.filter(function(l){
        return l.resource
            && l.resource["cnt:chars"]
            && l.resource["cnt:chars"].length > 0;
    });
    if(scribedLines.length!==lines.length){
        var i;
        for (i=1;i<lines.length;i++){
            if (lines[i].modified > focusOn.modified) {
                focusOn = lines[i];
            }
            if(i === lines.length -1){
                updatePresentation($(".transcriptlet[lineserverid='"+focusOn.tpen_line_id+"']"));
            }
        }
    }
    else{
        updatePresentation($(".transcriptlet[lineserverid='"+focusOn.tpen_line_id+"']"));
    }
    
};

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
    if (canvasObj.images[0].resource['@id'] !== undefined && canvasObj.images[0].resource['@id'] !== ""){ //Only one image
        var image = new Image();
        //Check to see if we can use a preloaded image...
        if(tpen.project.folioImages[tpen.screen.currentFolio].image){
            image = tpen.project.folioImages[tpen.screen.currentFolio].image;
            tpen.project.folioImages[tpen.screen.currentFolio].preloaded = true; //We know it is preloaded, ensure the flag is correct.
        }
        else{
            //image = new Image();
        }
        image.src = "";
        image.onload = function(){
            $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
            $("#imgTop img, #imgBottom img").css("width", "100%");
            $("#imgBottom").css("height", "inherit");
            if(permissionForImage){
                $('.transcriptionImage').attr('src', canvasObj.images[0].resource['@id'].replace('amp;', ''));
                $("#fullPageImg").attr("src", canvasObj.images[0].resource['@id'].replace('amp;', ''));
                populateCompareSplit(tpen.screen.currentFolio);
                populateHistorySplit(tpen.screen.currentFolio);
                //FIXME At some point I had to track tpen.screen.originalCanvasHeight differently.  Not sure that
                //I need to anymore, test making these tpen.screen.* and see what happens.
                originalCanvasHeight2 = $("#imgTop img").height();
                originalCanvasWidth2 = $("#imgTop img").width();
                tpen.screen.originalCanvasHeight = $("#imgTop img").height();
                tpen.screen.originalCanvasWidth =  $("#imgTop img").width();
                drawLinesToCanvas(canvasObj, parsing, tool);
                getHistory(); //Do we need to call this later down the stack?  It could be moved into drawLinesToCanvas()
                $("#transcriptionCanvas").attr("canvasid", canvasObj["@id"]);
                $("#transcriptionCanvas").attr("annoList", canvasAnnoList);
                $("#parseOptions").find(".tpenButton").removeAttr("disabled");
                $("#parsingBtn").removeAttr("disabled");
                tpen.screen.textSize();
                if(!ipr_agreement){
                    $('#iprAccept').show();
                    $(".trexHead").show();
                }
                if(!tpen.project.folioImages[tpen.screen.currentFolio].preloaded){
                    tpen.project.folioImages[tpen.screen.currentFolio].image =  image;
                    tpen.project.folioImages[tpen.screen.currentFolio].preloaded = true; //It is now preloaded.
                }
                focusOnLastModified();
                updatePageLabels(pageTitle);
                
            }
            else{
                $('#requestAccessContainer').show();
                $(".trexHead").show();
                //handle the background
                var image2 = new Image();
                image2.src = "";
                image2
                .onload = function(){
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
                };
                image2.src = "images/missingImage.png";
            }
            window.setTimeout(function(){
                preloadFolioImages();
            }, 15000);
            scrubNav();
        }; // the extra () ensures this only runs once.
        image.onerror =function(){
            var image2 = new Image();
            image2.src = "";
            image2
            .onload = function(){
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
            };
            image2.src = "images/missingImage.png";
        };
        image.src = canvasObj.images[0].resource['@id'].replace('amp;', '');
    }
    else {
        $('.transcriptionImage').attr('src', "images/missingImage.png");
        throw Error("The canvas is malformed.  No 'images' field in canvas object or images:[0]['@id'] does not exist.  Cannot draw lines.");
    }
    resetImageTools(true);
    //createPreviewPages(); //each time you load a canvas to the screen with all of its updates, remake the preview pages.
}

function updatePageLabels(pageTitle){
    $("#trimPage").html(pageTitle);
    $("#trimPage").attr("title", pageTitle);
    var selectedOption = $("#pageJump").find("option:selected");
    var selectedOptionText = selectedOption.html();
    selectedOptionText = selectedOptionText.replace("‣","");
    selectedOption.html(selectedOptionText);
    $.each($("#pageJump").find("option"), function(){
        $(this).prop("selected", false);
        var option = $(this);
        var optionText = option.html();
        optionText = optionText.replace("‣","");
        option.html(optionText);
    });
    $("#pageJump").find("option").prop("selected", false);
    $("option[val='"+pageTitle+"']").prop("selected", true).attr("selected",true).html("‣"+pageTitle);
}

/*
 * @paran canvasObj  A canvas object to extract transcription lines from and draw to the interface.
 * @param parsing boolean if parsing is live tool
 * Here, we are planning to draw the lines to the transcription canvas.  We must checking which version of the project this is for.
 * Some versions check an SQL DB, some hit the annotation store.  We know which version it is by where the lines are with the canvas.
 */
function drawLinesToCanvas(canvasObj, parsing, tool) {
    var lines = [];
//    var currentFolio = parseInt(tpen.screen.currentFolio);
    if ((canvasObj.resources !== undefined && canvasObj.resources.length > 0)) {
        //This situation means we got our lines from the SQL and there is no need to query the store.  This is TPEN28 1.0
//        for (var i = 0; i < canvasObj.resources.length; i++) {
//            if (isJSON(canvasObj.resources[i])) {   // it is directly an annotation
//                lines.push(canvasObj.resources[i]);
//            }
//        }
//        tpen.screen.dereferencedLists[tpen.screen.currentFolio] = canvasObj.otherContent[0];
        throw new Error("Your annotation data is in an unsupported format and cannot be used with this tanscription service.");
        //TODO what should we do with the interface?  Is this OK?
        $("#transTemplateLoading")
            .hide();
        $("#transcriptionTemplate")
            .show();
        $('#transcriptionCanvas')
            .css('height', tpen.screen.originalCanvasHeight +"px");
        $('.lineColIndicatorArea')
            .css('height', tpen.screen.originalCanvasHeight +"px");
        $("#imgTop")
            .css("height", "0%");
        $("#imgBottom img")
            .css("top", "0px");
        $("#imgBottom")
            .css("height", "inherit");
    }
    else if((canvasObj.otherContent[0] !== undefined && canvasObj.otherContent[0].resources !== undefined && canvasObj.otherContent[0].resources.length > 0)){
        //This is TPEN28 2.8 using the SQL
        //This situation means we got our lines from the SQL and there is no need to query the store.
        tpen.screen.dereferencedLists[tpen.screen.currentFolio] = canvasObj.otherContent[0];
        drawLinesOnCanvas(canvasObj.otherContent[0].resources, parsing, tool);
    }
    else {
        throw new Error("Your annotation data is in an unsupported format and cannot be used with this tanscription service.");
        //TODO what should we do with the interface?  Is this OK?
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
        // we have the anno list for this canvas (potentially), so query for it.
        // This is TPEN28 2.8, using the annotation store.
//        var annosURL = "getAnno";
//        var onValue = canvasObj["@id"];
//        var properties = {
//            "@type": "sc:AnnotationList", "on": onValue, proj: tpen.project.id
//        };
//        var paramOBJ = {
//            "content": JSON.stringify(properties)
//        };
//        if ($.type(canvasObj.otherContent) === "string") {
//            $.post(annosURL, paramOBJ, function (annoList) {
//                if (!tpen.manifest.sequences[0].canvases[currentFolio]) {
//                    throw new Error("Missing canvas:" + currentFolio);
//                }
//                if (!tpen.manifest.sequences[0].canvases[currentFolio].otherContent) {
//                    tpen.manifest.sequences[0].canvases[currentFolio].otherContent = new Array();
//                }
//                //FIXME: The line below throws a JSON error sometimes, especially on first load.
//                var annoList = tpen.manifest.sequences[0].canvases[currentFolio].otherContent = tpen.manifest.sequences[0].canvases[currentFolio].otherContent.concat(JSON.parse(annoList));
//                var currentList = {};
//                updateURL("p");
//                if (annoList.length > 0) {
//                    // Scrub resolved lists that are already present.
//                    lines = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], true, parsing, tool);
//                }
//                else {
//                    // couldnt get list.  one should always exist, even if empty.
//                    // We will say no list and changes will be stored locally to the canvas.
//                    if (parsing !== "parsing") {
//                        $("#noLineWarning")
//                            .show();
//                    }
//                    $("#transTemplateLoading")
//                        .hide();
//                    $("#transcriptionTemplate")
//                        .show();
//                    $('#transcriptionCanvas')
//                        .css('height', $("#imgTop img")
//                            .height() + "px");
//                    $('.lineColIndicatorArea')
//                        .css('height', $("#imgTop img")
//                            .height() + "px");
//                    $("#imgTop")
//                        .css("height", "0%");
//                    $("#imgBottom img")
//                        .css("top", "0px");
//                    $("#imgBottom")
//                        .css("height", "inherit");
//                    $("#parsingBtn")
//                        .css("box-shadow", "0px 0px 6px 5px yellow");
//                }
//            });
//        } else if (canvasObj.otherContent && canvasObj.otherContent[0] && canvasObj.otherContent[0].resources) {
//            tpen.screen.dereferencedLists[tpen.screen.currentFolio] = tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[0];
//            drawLinesOnCanvas(canvasObj.otherContent[0].resources, parsing, tool);
//        }
    }
    tpen.screen.textSize();
}
function updateURL(piece, classic){
    var toAddressBar = document.location.href;
    //If nothing is passed in, just ensure the projectID is there.
    //console.log("does URL contain projectID?        "+getURLVariable("projectID"));
    if(!getURLVariable("projectID")){
        toAddressBar = "?projectID="+tpen.project.id;
    }
    //Any other variable will need to be replaced with its new value
    if(piece === "p"){
        if(!getURLVariable("p")){
            toAddressBar += "&p=" + tpen.project.folios[tpen.screen.currentFolio].folioNumber;
        }
        else{
            toAddressBar = replaceURLVariable("p", tpen.project.folios[tpen.screen.currentFolio].folioNumber);
        }
        var relocator = "buttons.jsp?p="+tpen.project.folios[tpen.screen.currentFolio].folioNumber+"&projectID="+tpen.project.id;
        $(".editButtons").attr("href", relocator);
    }    
    window.history.pushState("", "T&#8209;PEN Transcription", toAddressBar);
}

/* Go to the transcription.jsp interface, which is the classic version */
function switchToClassicTranscription(){
    //Make sure the exitPage functionality goes with this.
    var newURL = "transcription.jsp?projectID="+getURLVariable('projectID')+"&p="+getURLVariable('p');
    document.location.href = newURL;
}


/*
 * Reorder the array of lines into the correct order for an RTL interface.  Return this back
 * to drawLinesDesignateColumns(), with the RTL flag false as to avoid the recursion loop. 
 * 
 */
function reorderLinesForRTL(lines, tool, preview){
    var firstBy=function(){function n(n){return n}function t(n){return"string"==typeof n?n.toLowerCase():n}
        function r(r,e){if(e="number"==typeof e?{direction:e}:e||{},"function"!=typeof r)
            {var u=r;r=function(n){return n[u]?n[u]:""}}if(1===r.length)
            {var i=r,o=e.ignoreCase?t:n;r=function(n,t){return o(i(n))<o(i(t))?-1:o(i(n))>o(i(t))?1:0}}
            return-1===e.direction?function(n,t){return-r(n,t)}:r}function e(n,t){return n=r(n,t),n.thenBy=u,n}
        function u(n,t){var u=this;return n=r(n,t),e(function(t,r){return u(t,r)||n(t,r)})}return e}();
    
    lines.sort(
            //First sort by X in Descending order (largestX to smallestX). Then, keeping that ordering principle, order by greatest y.
            firstBy(function (linea, lineb) {
                if (linea.on && lineb.on){
                    var LINEAxywh = linea.on.slice(linea.on.indexOf("#xywh=") + 6).split(",");
                    var LINEBxywh  = lineb.on.slice(lineb.on.indexOf("#xywh=") + 6).split(",");
                    var LINEAx = parseInt(LINEAxywh[0]);
                    var LINEBx = parseInt(LINEBxywh[0]);
                    return LINEBx - LINEAx;
                }
            })
            .thenBy(function (linea, lineb) {
                if (linea.on && lineb.on){
                    var LINEAxywh = linea.on.slice(linea.on.indexOf("#xywh=") + 6).split(",");
                    var LINEBxywh  = lineb.on.slice(lineb.on.indexOf("#xywh=") + 6).split(",");
                    var LINEAy = parseInt(LINEAxywh[1]);
                    var LINEBy = parseInt(LINEBxywh[1]);
                    return LINEAy - LINEBy;
                }
            })
    );
    if(preview){
        //Not sure we want the reordering for building prevew pages to be authoritative in setting dereferencedLists value
    }
    else{
        tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources = lines;
        tpen.screen.focusItem[0] = null;
        tpen.screen.focusItem[1] = null;
        drawLinesDesignateColumns(lines, tool, false, "RTL");
    }
    return lines;
}

/*
 * Reorder the array of lines into the correct order for an LTR interface.  Return this back
 * to drawLinesDesignateColumns(), with the RTL flag false as to avoid the recursion loop. 
 * 
 * *Note the call the returns the lines from the database in getList() returns them already in LTR order.
 * 
 */
function reorderLinesForLTR(lines){
    var firstBy=function(){function n(n){return n}function t(n){return"string"==typeof n?n.toLowerCase():n}
        function r(r,e){if(e="number"==typeof e?{direction:e}:e||{},"function"!=typeof r)
            {var u=r;r=function(n){return n[u]?n[u]:""}}if(1===r.length)
            {var i=r,o=e.ignoreCase?t:n;r=function(n,t){return o(i(n))<o(i(t))?-1:o(i(n))>o(i(t))?1:0}}
            return-1===e.direction?function(n,t){return-r(n,t)}:r}function e(n,t){return n=r(n,t),n.thenBy=u,n}
        function u(n,t){var u=this;return n=r(n,t),e(function(t,r){return u(t,r)||n(t,r)})}return e}();
    
    lines.sort(
            //First sort by X in Descending order (largestX to smallestX). Then, keeping that ordering principle, order by greatest y.
            firstBy(function (linea, lineb) {
                if (linea.on && lineb.on){
                    var LINEAxywh = linea.on.slice(linea.on.indexOf("#xywh=") + 6).split(",");
                    var LINEBxywh  = lineb.on.slice(lineb.on.indexOf("#xywh=") + 6).split(",");
                    var LINEAx = parseInt(LINEAxywh[0]);
                    var LINEBx = parseInt(LINEBxywh[0]);
                    return LINEAx - LINEBx;
                }
            })
            .thenBy(function (linea, lineb) {
                if (linea.on && lineb.on){
                    var LINEAxywh = linea.on.slice(linea.on.indexOf("#xywh=") + 6).split(",");
                    var LINEBxywh  = lineb.on.slice(lineb.on.indexOf("#xywh=") + 6).split(",");
                    var LINEAy = parseInt(LINEAxywh[1]);
                    var LINEBy = parseInt(LINEBxywh[1]);
                    return LINEAy - LINEBy;
                }
            })
    );
    tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources = lines;
    tpen.screen.focusItem[0] = null;
    tpen.screen.focusItem[1] = null;
    drawLinesDesignateColumns(lines, tpen.screen.liveTool, false, "LTR"); 
    return lines;
}

/* Certain pieces in the interface need to move, based on which interface is active. */
function performInterfaceShift(interface){
    tpen.screen.mode = interface;
    if(interface === "RTL"){
        $("#toggleXML").hide();
        $("#xmlTagPopin").hide();
        $("#prevPage").after($("#toggleNotes")); //This moves note button to the left side
        $("#toggleNotes").removeClass("pull-left").addClass("pull-right").removeClass("clear-left").addClass("clear-right");
        $(".notes").each(function(){
            var notes = $(this);
            var textarea = $(this).prev();
            textarea.before(notes); //This moves notes to the left side.  
        });
    }
    else if(interface === "LTR"){
        $("#toggleXML").show();
        $("#nextPage").after($("#toggleNotes")); //This moves notes button to the right side. 
        $("#toggleNotes").removeClass("pull-right").addClass("pull-left").removeClass("clear-right").addClass("clear-left");
        $(".notes").each(function(){
            var notes = $(this);
            var textarea = $(this).next();
            textarea.after(notes); //This moves notes to the right side.  
        });
    }
    tpen.screen.textSize();
}

/* 
 * Take line data, turn it into HTML elements and put them to the DOM 
 * The lines come from the back end in LTR order.  The function
 * must figure out line#s and column letters.  Only supporting
 * top to bottom && (LTR || RTL)
 * */
function drawLinesDesignateColumns(lines, tool, RTL, shift, preview){
    $(".lineColIndicatorArea").empty(); //Clear the lines that are drawn off the screen.  This is in case of an interface toggle.
    $(".transcriptlet").remove(); //Clear out the transcriptlets, they are being redrawn.
    if(RTL){
        reorderLinesForRTL(lines, tool, false);
        //^^ This will loop us back here with lines in a new order.
        return false;
    }
    if(preview){
        
    }
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
    var colCounter = 1;
    var image = $('#imgTop img');
    var theHeight = image.height();
    var theWidth = image.width();
    $('#transcriptionCanvas').css('height', tpen.screen.originalCanvasHeight + "px");
    $('.lineColIndicatorArea').css('height', tpen.screen.originalCanvasHeight + "px");
    var ratio = 0;
    ratio = theWidth / theHeight;
    //Why does this run twice when i am going fullPage() from parsing interface?
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
                            colCounter = 1; //Reset line counter so that when the column changes the line# restarts
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
        $("#fullpageSplitCanvas").append(fullPageLineColumnIndicator);
        colCounter++;
    }
    checkParsingReroute(); //If liveTool is fed in from a page refresh, this does not check the pageJump() jumping into parsing.  
    if (update && $(".transcriptlet").eq(0).length > 0){
//        if(shift === "RTL"){ 
//            //focusOnLastModified(); 
//            //ultimately this is a little weird when toggling interfaces.  If it were focused on the the first line in LTR
//            //it ends up focusing on the first line in the last column...need a fix for that.  FIXME
//            focusOnLastModified
//            updatePresentation($(".transcriptlet").eq(0));
//        }
//        else{
//            
//        }
        focusOnLastModified();
        //updatePresentation($(".transcriptlet").eq(0));
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
        markLineUnsaved($(e.target).parent());

    })
        .keyup(function(e){
            //Preview.updateLine(this);
            var lineToUpdate = $(this).parent();
            clearTimeout(typingTimer);
            //when a user stops typing for 2 seconds, fire an update to get the new text.
            if(e.which !== 18){
                typingTimer = setTimeout(function(){
                    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false, false);
                    var idToCheckFor = lineToUpdate.attr("lineserverid").replace("line/", "");
                    var newText = lineToUpdate.find(".theText").val();
                    if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
                    // if it IIIF, we need to update the list
                        $.each(currentAnnoList, function(index, data){
                            var dataLineID = data.tpen_line_id.replace("line/", "");
                            if(dataLineID == idToCheckFor){
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
//    if(tpen.screen.mode !== shift){
//        performInterfaceShift(shift);
//    }
    if(tpen.screen.mode === "RTL"){
        performInterfaceShift("RTL");
    }
    
    $("#transTemplateLoading").hide(); //if we drew the lines, this can disappear.;
    createPreviewPages(); //Every time we load a canvas to the screen with its new updates, we want to update previewPages as well.
}

/* Make the transcription interface focus to the transcriptlet passed in as the parameter. */
function updatePresentation(transcriptlet) {
    if (transcriptlet === undefined || transcriptlet === null){
        $("#imgTop").css("height", "0%");
        $("#imgBottom").css("height", "inherit");
        return false;
    }
    var currentCol = transcriptlet.attr("col");
    var currentColLineNum = parseInt(transcriptlet.attr("collinenum"));
    var transcriptletBefore = $(transcriptlet.prev());
    var currentColLine = currentCol + "" + currentColLineNum;
    $("#currentColLine").html(currentColLine);
    if (parseInt(currentColLineNum) >= 1){
        if (transcriptletBefore.hasClass("transcriptlet")){
            var prevColLineNum = parseInt(transcriptletBefore.attr("collinenum"));
            var prevLineCol = transcriptletBefore.attr("col");
            var prevLineText = unescape(transcriptletBefore.attr("data-answer"));
            var prevLineNote = unescape(transcriptletBefore.find(".notes").attr("data-answer"));
            $("#prevColLine").html(prevLineCol + "" + prevColLineNum).css("visibility","");
            $("#captionsText").text((prevLineText.length && prevLineText) || "This line is not transcribed.").attr("title",prevLineText)
                .next().html(prevLineNote).attr("title",prevLineNote);
        }
        else { //there is no previous line
            $("#prevColLine").html(prevLineCol + "" + prevColLineNum).css("visibility","hidden");
            $("#captionsText").html("You are on the first line.").next().html("");
        }
    }
    else { //this is a problem
        $("#prevColLine").html(currentCol + "" + currentColLineNum-1).css("visibility","hidden");
        $("#captionsText").html("ERROR.  NUMBERS ARE OFF").next().html("");
    }
    tpen.screen.focusItem[0] = tpen.screen.focusItem[1];
    tpen.screen.focusItem[1] = transcriptlet;
    if ((tpen.screen.focusItem[0] === null)
        || (tpen.screen.focusItem[0].attr("id") !== tpen.screen.focusItem[1].attr("id"))) {
        adjustImgs(setPositions());
        swapTranscriptlet();
        History.contribution();
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
    if(tpen.screen.liveTool === "history"){
        History.showLine(transcriptlet.attr("lineserverid"));
    }
};

/* Helper for position focus onto a specific transcriptlet.  Makes sure workspace stays on screen. */
function setPositions() {
    // Determine size of section above workspace
    var bottomImageHeight = $("#imgBottom img").height();
    if (tpen.screen.focusItem[1].attr("lineHeight") !== null) {
        var pairForBookmarkCol = tpen.screen.focusItem[1].attr('col');
        var pairForBookmarkLine = parseInt(tpen.screen.focusItem[1].attr('collinenum'));
        var pairForBookmark = pairForBookmarkCol + pairForBookmarkLine;
        var currentLineHeight = parseFloat(tpen.screen.focusItem[1].attr("lineHeight"));
        var currentLineTop = parseFloat(tpen.screen.focusItem[1].attr("lineTop"));
        var previousLineTop = 0.0;
        var previousLineHeight = 0.0;
        var imgTopHeight = 0.0; //value for the height of imgTop
        if(tpen.screen.focusItem[1].prev().is('.transcriptlet') && currentLineTop > parseFloat(tpen.screen.focusItem[1].prev().attr("lineTop"))){
            previousLineTop = parseFloat(tpen.screen.focusItem[1].prev().attr("lineTop"));
            previousLineHeight = parseFloat(tpen.screen.focusItem[1].prev().attr("lineHeight"));
        }
        var bufferForImgTop = previousLineTop - 1.5;
        if(previousLineHeight > 0.0){
            imgTopHeight = (previousLineHeight + currentLineHeight) + 3.5;
        }
        else{ //there may not be a prev line so use the value of the current line...
            imgTopHeight = (currentLineHeight) + 3.5;
            bufferForImgTop = currentLineTop - 1.5;
        }
        //var topImgPositionPercent = ((previousLineTop - currentLineTop) * 100) / imgTopHeight;
        var imgTopSize = (((imgTopHeight/100)*bottomImageHeight) / Page.height())*100;
        if(bufferForImgTop < 0){
            bufferForImgTop = 0;
        }
        //We may not be able to show the last line + the next line if there were two tall lines, so account for that here
        if (imgTopSize > 80){
            bufferForImgTop = currentLineTop - 1.5; //No longer adjust to previous line, adjust to current line.
            if(bufferForImgTop < 0){
                bufferForImgTop = 0;
            }
            imgTopHeight = (currentLineHeight) + 3.5; //There will be a new height because of it
            imgTopSize = (((imgTopHeight/100)*bottomImageHeight) / Page.height())*100; //There will be a new size because of it to check later.
        }
        var topImgPositionPx = ((-(bufferForImgTop) * bottomImageHeight) / 100);
        if(topImgPositionPx <= -12){
            topImgPositionPx += 12;
        }
        //var bottomImgPositionPercent = -(currentLineTop + currentLineHeight);
        var bottomImgPositionPx = -((currentLineTop + currentLineHeight) * bottomImageHeight / 100);
        if(bottomImgPositionPx <= -12){
            bottomImgPositionPx += 12;
        }

        var percentageFixed = 0;
        //use this to make sure workspace stays on screen!
        if (imgTopSize > 80){ //if #imgTop is 80% of the screen size then we need to fix that so the workspace stays.
            var workspaceHeight = 170; //$("#transWorkspace").height();
            var origHeight = imgTopHeight;
            imgTopHeight = ((Page.height() - workspaceHeight - 80) / bottomImageHeight) *  100; //this needs to be a percentage
            percentageFixed = (100-(origHeight - imgTopHeight))/100; //what percentage of the original amount is left
            //bottomImgPositionPercent *= percentageFixed; //do the same percentage change to this value
            bottomImgPositionPx *= percentageFixed; //and this one
            topImgPositionPx *= percentageFixed; // and this one

        }

    }
    var positions = {
        imgTopHeight: imgTopHeight,
        //topImgPositionPercent: topImgPositionPercent,
        topImgPositionPx : topImgPositionPx,
        //bottomImgPositionPercent: bottomImgPositionPercent,
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



function magnify(imgFlag, event){
    //For separating out different imgs on which to zoom.
    var container = ""; // #id of limit
    var img;
    if (imgFlag === "trans"){
        img = $("#transcriptionTemplate");
        container = "transcriptionCanvas";
        $("#magnifyTools").fadeIn(800);
        $("button[magnifyimg='trans']").addClass("selected");
    }
    else if (imgFlag === "compare"){
        img = $("#compareSplit");
        container = "compareSplit";
        $("#magnifyTools").fadeIn(800).css({
            "left":$("#compareSplit").css("left"),
            "top" : "100px"
        });
        $("button[magnifyimg='compare']").addClass("selected");
    }
    else if (imgFlag === "full"){
        img = $("#fullpageSplitCanvas");
        container = "fullpageSplit";
        $("#magnifyTools").fadeIn(800).css({
            "left":$("#fullpageSplit").css("left"),
            "top" : "100px"
        });
        $("button[magnifyimg='full']").addClass("selected");
    }
    $("#zoomDiv").show();
    $("#zoomat").text(Math.round(tpen.screen.zoomMultiplier*10)/10+"x");
    $(".magnifyHelp").show();
    hideWorkspaceToSeeImage(imgFlag);
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
    
    var imgTop = $img.find("img").css("top");
    var imgLeft = $img.find("img").css("left");
    if(imgTop === "auto")imgTop="0px";
    if(imgLeft === "auto")imgLeft="0px";
    var imgOffset = $img.find("img").offset().top;
    var imgDims = new Array(parseInt(imgLeft), parseInt(imgTop), $img.width(), $img.height());
    //build the zoomed div
    var zoomSize = (page.height() / 3 < 120) ? 120 : page.height() / 3;
    if(zoomSize > 400) zoomSize = 400;
    var zoomPos = new Array(event.pageX, event.pageY);
    $("#zoomDiv").css({
        "box-shadow"    : "2px 2px 5px black,15px 15px " + zoomSize / 3 + "px rgba(230,255,255,.8) inset,-15px -15px " + zoomSize / 3 + "px rgba(0,0,15,.4) inset",
        "width"         : zoomSize,
        "height"        : zoomSize,
        "left"          : zoomPos[0] + 3,
        "top"           : zoomPos[1] + 3 - $(document).scrollTop() - $(".magnifyBtn").offset().top + imgOffset,
        "background-position" : imgLeft+""+imgTop,
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
            if ( mouseAt[0] < contain.left - $("#"+container).offset().left
                || mouseAt[0] > contain.left+$("#"+container).width()
                || mouseAt[1] < contain.top
                || mouseAt[1] > contain.top+$("#"+container).height()){
                return false; // drop out, you've left containment
            }
            var zoomPos = new Array(mouseAt[0] - zoomSize / 2, mouseAt[1] - zoomSize / 2);
            var imgPos = new Array((imgDims[0] - mouseAt[0] + contain.left) * tpen.screen.zoomMultiplier + zoomSize / 2 - 3, (imgDims[1] - mouseAt[1] + contain.top) * tpen.screen.zoomMultiplier + zoomSize / 2 - 3); //3px border adjustment
            $("#zoomDiv").css({
                "left"  : zoomPos[0],
                "top"   : zoomPos[1] - $(document).scrollTop() + imgOffset,
                "background-size"     : imgDims[2] * tpen.screen.zoomMultiplier + "px",
                "background-position" : imgPos[0] + "px " + imgPos[1] + "px"
            });
        }
    }, $img);
}

tpen.screen.toggleMoveImage = function (event) {
    if (event && event.altKey && (event.ctrlKey || event.metaKey)) {
        tpen.screen.toggleMove = true;
        $(".lineColIndicatorArea").hide();
        fullTopImage();
        $("#imgTop")
            .mousedown(moveImg) //This will handle the mouse up
    }
    else {
        $(document).unbind("mousemove"); //This is what we needed from the mousup event
        tpen.screen.isMoving = false; //This is what we needed from the mouseup event.
        tpen.screen.toggleMove = false;
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
    if ($("#transcriptionTemplate").hasClass("ui-resizable")){
        $("#transcriptionTemplate").resizable('destroy');
    }
    $("#transcriptionTemplate").css("max-width", "55%").css("width", "55%");
    //$("#transcriptionCanvas").css("max-height", window.innerHeight + "px");
    //$("#transcriptionTemplate").css("max-height", window.innerHeight + "px");
    $("#controlsSplit").hide();
    var ratio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
    var newCanvasWidth = tpen.screen.originalCanvasWidth * .55;
    var newCanvasHeight = 1 / ratio * newCanvasWidth;

    if($(window).height() <= 625){ //This is the smallest height we allow
        newCanvasHeight = 625;
    }
    else if ($(window).height() <= tpen.screen.originalCanvasHeight){ //allow it to be as tall as possible, but not taller.
        newCanvasHeight = $(window).height();
        newCanvasWidth = ratio*newCanvasHeight;
    }
    else if($(window).height() > tpen.screen.originalCanvasHeight){ //I suppose this is possible for small images, so handle if its trying to be bigger than possible
        newCanvasHeight = tpen.screen.originalCanvasHeight;
        newCanvasWidth = tpen.screen.originalCanvasWidth;
    }

    if($(window).width() > 900){ //Whenever it gets less wide than this, it prioritizes height and stops resizing by width.
        if($(window).width() < newCanvasWidth + $("#parsingSplit").width()){
            newCanvasWidth = $(window).width() - $("#parsingSplit").width();
            newCanvasHeight = 1/ratio*newCanvasWidth;
        }
    }
    else{ //Just do nothing instead of calling it 900 wide so it defaults to the height math, maybe put a max up there too.
//                     newCanvasWidth = 900;
//                     newCanvasHeight = 1/ratio*newCanvasWidth;
    }
    $("#transcriptionTemplate").css("width","auto");
    $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
    $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
    $("#imgTop").css("height", newCanvasHeight + "px");
    $("#imgTop").css("width", newCanvasWidth + "px");
    $("#imgTop img").css({
        'height': newCanvasHeight + "px"
    });

    $("#prevCanvas").attr("onclick", "");
    $("#nextCanvas").attr("onclick", "");
    $("#imgTop").addClass("fixingParsing");
    var topImg = $("#imgTop img");

    $("#tools").children("[id$='Split']").hide();
    $("#parsingSplit")
    .css({
        "display": "inline-block",
        //"height": window.innerHeight + "px"
    })
    .fadeIn();

    topImg.css({
        "top":"0px",
        "left":"0px",
        "overflow":"auto"
    });
    $("#imgTop .lineColIndicatorArea").css({
        "top":"0px",
        "left":"0px",
        "height":newCanvasHeight+"px"
    });
    if(screen.width == $(window).width() && screen.height == window.outerHeight){
        $(".centerInterface").css("text-align", "center").css("background-color", "#e1f4fe");
    }
    else{
        $(".centerInterface").css("text-align", "left").css("background-color", "#e1f4fe");
    }
    $("#transWorkspace,#imgBottom").hide();
    $("#noLineWarning").hide();
    window.setTimeout(function(){
        $("#imgTop img").css("width", "auto");
        $("#imgTop img").css("top", "0px");
        $("#transcriptionTemplate").css("width", "auto"); //fits canvas to image. $("#imgTop img").width() + "px".  Do we need a background color?
        $("#transcriptionCanvas").css("display", "block");
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
    $("#imgBottom").css("height", "inherit");
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

function hideWorkspaceToSeeImage(which){
    if(which === "trans"){
        $("#transWorkspace").hide();
        $("#imgBottom").css({
            "height": "100%"
        });
        $(".hideMe").hide();
        $(".showMe2").show();
    }
    else{
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
    if ($("#transcriptionTemplate").hasClass("ui-resizable")){
        $("#transcriptionTemplate").resizable('destroy');
    }
    $("#splitScreenTools").find('option:eq(0)').prop("selected", true);
    $("#transcriptionCanvas").css("width", "100%");
    $("#transcriptionCanvas").css("height", "auto");
    $("#transcriptionCanvas").css("max-height", "none");
    $("#transcriptionTemplate").css("width", "100%");
    $("#transcriptionTemplate").css("max-width", "100%");
    $("#transcriptionTemplate").css("max-height", "none");
    $("#transcriptionTemplate").css("height", "auto");
    $("#transcriptionTemplate").css("display", "inline-block");
    $("#canvasControls").removeClass("selected");
    $('.lineColIndicatorArea').css("max-height","none");
    $('.lineColIndicatorArea').show();
    $(".centerInterface").css("text-align", "left").css("background-color", "white");
    $("#help").css({"left":"100%"}).fadeOut(1000);
    $("#fullScreenBtn").fadeOut(250);
    tpen.screen.isZoomed = false;
    $(".split").css("width", "").css("display","");
    restoreWorkspace();
    $("#splitScreenTools").show();
    var screenWidth = $(window).width();
    $("#transcriptionCanvas").css("height", tpen.screen.originalCanvasHeight + "px");
    $(".lineColIndicatorArea").css("height", tpen.screen.originalCanvasHeight + "px");

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
        $(".transcriptlet").remove(); //we are about to redraw these, if we dont remove them, then the transcriptlets repeat.
        setTimeout(function(){
            redraw("");
        }, 750);
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
        if($("#controlsSplit").is(":visible")){
            return fullPage();
        }
        $("#transcriptionCanvas").css("width", Page.width()-200 + "px");
        $("#transcriptionTemplate").css("width", Page.width()-200 + "px");
        $("#canvasControls").addClass("selected");
        newCanvasWidth = Page.width()-200;
        $("#controlsSplit").show();
        resize = false; //interupts parsing resizing funcitonaliy, dont need to resize for this anyway.
    }
    if(tool==="help"){
        if($("#helpSplit").is(":visible")){
            return fullPage();
        }
        $("#transcriptionCanvas").css("width", Page.width()-500 + "px");
        $("#transcriptionTemplate").css("width", Page.width()-500 + "px");
        newCanvasWidth = Page.width()-500;
        $("#helpSplit").show().height(Page.height()-$("#helpSplit").offset().top).scrollTop(0); // header space
        $("#helpContainer").height(Page.height()-$("#helpContainer").offset().top);
        resize = false; //interupts parsing resizing funcitonaliy, dont need to resize for this anyway.
    }
    if(tool === "parsing"){
        resize=false;
    }
    if(tool === "preview"){
        $("#previewSplit").show().height(Page.height()-$("#previewSplit").offset().top).scrollTop(0); // header space
        $("#previewDiv").height(Page.height()-$("#previewDiv").offset().top);
//        if(tpen.screen.mode === "RTL"){
//            $(".previewText").css("text-align", "right"); //For a more natural right to left reading?
//        }
    }
    var ratio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
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
    
    if(resize){
        attachTemplateResize();
    } else {
        $("#templateResizeBar").hide();
    }
    $("#fullScreenBtn")
        .fadeIn(250);
        $('.split').hide();
    //show/manipulate whichever split tool is activated.
    //This is a user added iframe tool.  tool is toolID= attribute of the tool div to show.
    var splitScreen = $("#" + tool + "Split");
    if(!splitScreen.size()) splitScreen = $('div[toolname="' + tool + '"]');
    splitScreen.css("display", "block");
    $(".split:visible")
        .find('img')
        .css({
            'max-height': window.innherHeight + 350 + "px",
            'max-width': $(".split:visible")
                .width() + "px"
        });
    if(tool==="history"){
        $("#historyBookmark").empty();
        var splitSrc = $(".transcriptionImg:first").attr("src");
        $("#historyViewer").find("img").attr("src", splitSrc);
        History.showLine(tpen.screen.focusItem[1].attr("lineserverid"));
        $(".historyText").attr("dir", "auto"); //These elements don't always get set on page load, so make sure they are auto here.   
    }
    if(tool === "fullpage"){ //set this to be the max height initially when the split happens.
        var fullPageMaxHeight = window.innerHeight - 125; //100 comes from buttons above image and topTrim
        $("#fullPageImg").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
        $("#fullpageSplitCanvas").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
        $("#fullpageSplitCanvas").css("max-width", $("#fullPageImg").width()); //If we want to keep the full image on page, it cant be taller than that.
        $("#fullpageSplitCanvas").height($("#fullPageImg").height());
        $("#fullpageSplitCanvas").width($("#fullPageImg").width());
        $(".fullP").each(function(i){
            this.title = $("#transcriptlet_"+i+" .theText").text();
        })
            .tooltip();
    }
    if(tool === "compare"){
         var fullPageMaxHeight = window.innerHeight - 125; //100 comes from buttons above image and topTrim
        $("#compareSplit img").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
    }
    setTimeout(function(){
        $.each($(".lineColOnLine"), function(){
            $(this).css("line-height", $(this).parent().height() + "px");
        });
    }, 1000);
    
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

function populateHistorySplit(folioIndex){
    var historySrc = tpen.manifest.sequences[0].canvases[folioIndex].images[0].resource["@id"];
    var currentHistorySrc = $("#historyViewer").find("img").attr("src");
    if (currentHistorySrc !== historySrc) $("#historyViewer").find("img").attr("src", historySrc);

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

function removeColumn(column){
    if (column.attr("hastranscription") === "true"){
        var cfrm = confirm("This column contains transcription data that will be lost.\n\nContinue?");
        if (!cfrm) return false;
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
    lines.addClass("deletable");
    if (tpen.screen.nextColumnToRemove.length > 0) {
        removeColumnTranscriptlets(lines, true);
    }
    else {
        var newURL = "transcription.html?projectID="+getURLVariable('projectID')+"&p="+getURLVariable('p')+"&liveTool=parsing";
        window.location.href= newURL;
        cleanupTranscriptlets(true, newURL);
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
    for (var j = 0; j < gatheredColumns.length; j++){
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
    //Why is this here?  BH 3-9-17
//    $(".parsingColumn")
//    .mouseenter(function(){
//        var lineInfo;
//        lineInfo = $("#transcription" + ($(this).index(".parsing") + 1)).val();
//        $("#lineInfo").empty()
//        .text(lineInfo)
//        .append("<div>" + $("#t" + ($(this).index(".line") + 1)).find(".counter").text() + "</div>")
//        .show();
//        if (!tpen.screen.isMagnifying){
//            $(this).addClass("jumpLine");
//        }
//    })
//    .mouseleave(function(){
//        $(".parsing").removeClass("jumpLine");
//        $("#lineInfo").hide();
//    })
//    .click(function(event){
//    });
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
                        removeLine(startLine, true, false);
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
                    removeLine(endLine, true, false);
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
            updateLinesInColumn(thisColumnID, true);
            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
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
            updateLinesInColumn(thisColumnID, true);
            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
            
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
//function clickedLine(e, event) {
//    //Stop ability to make a new line until the update from this process is complete.
//    if ($(e).hasClass("parsing")){
//        if ($("#addLines").hasClass('active') || $("#removeLines").hasClass('active')){
//        $("#parsingCover").show();
//            lineChange(e, event);
//        }
//    }
//    else {
//    }
//}

//function reparseColumns(){
//    $.each($('.parsingColumn'), function(){
//        var colX = $(this).attr("lineleft");
//        // collect lines from column
//        var lines = $(".parsing[lineleft='" + colX + "']");
//        lines.addClass("deletable");
//        var linesSize = lines.size();
//        // delete from the end, alerting for any deleted data
//        for (var i = linesSize; i > 0; i--){
//            removeLine(lines[i], true, false);
//        }
//    });
//}

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
                $(closeTag).click(function(event){
            //we could detect if tag is in this line.
                    if(event.target != this){return true;}
                    //makeUnsaved();
                    addchar("<" + $(this).text() + ">"); //there's an extra / somehow...
                    destroyClosingTag(this);
                });
                $(closeTag).mouseenter(function(){
                    $(this).append("<span onclick='destroyClosingTag(this.parentNode);' class='destroyTag ui-icon ui-icon-closethick right'></span>");
                });
                $(closeTag).mouseleave(function(){
                    $(this).find(".destroyTag").remove();
                });
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
                //console.log("Need to advance cursor pos by 1..." +sel.selectionStart, sel.selectionStart+1 );
                sel.setSelectionRange(sel.selectionStart+1, sel.selectionStart+1);
                updateLine($(myField).parent(), false, true);
            }
            //MOZILLA/NETSCAPE support
            else if (myField.selectionStart || myField.selectionStart == '0') {
                var startPosChar = myField.selectionStart;
                var endPos = myField.selectionEnd;
                var currentValue = myField.value;
                currentValue = currentValue.slice(0, startPosChar) + unescape(myValue) + currentValue.slice(startPosChar);
                myField.value = currentValue;
                myField.focus();
                //console.log("Need to advance cursor pos by 1..." +startPosChar, startPosChar+1 );
                myField.setSelectionRange(startPosChar+1, startPosChar+1);
                updateLine($(myField).parent(), false, true);
            }
            else{
                myField.value += myValue;
            }
        }
        else{ //its an xml tag
            if (document.selection) {
                if(fullTag === ""){
                    fullTag = "<"+myValue+">";
                }
                myField.focus();
                sel = document.selection.createRange();
                sel.text = unescape(fullTag);
                //console.log("Need to advance cursor pos by "+fullTag.length+"..."+sel.selectionStart, sel.selectionStart+fullTag.length);
                sel.setSelectionRange(sel.selectionStart+fullTag.length, sel.selectionStart+fullTag.length);
                updateLine($(myField).parent(), false, true);
                //return sel+unescape(fullTag).length;
            }
            //MOZILLA/NETSCAPE support
            else if (myField.selectionStart || myField.selectionStart == '0') {
                var startPos = myField.selectionStart;
                var endPos = myField.selectionEnd;
                if(fullTag === ""){
                        fullTag = "<" + myValue +">";
                }
                if (startPos !== endPos) {

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
                    //console.log("Need to put cursor at end of highlighted spot... "+endPos);
                    myField.setSelectionRange(endPos+fullTag.length+closeTag.length, endPos+fullTag.length+closeTag.length);
                    updateLine($(myField).parent(), false, true);

                }
                else {
                    myField.value = myField.value.substring(0, startPos)
                        + unescape(fullTag)
                        + myField.value.substring(startPos);
                    myField.focus();
                    //console.log("Move caret to startPos + tag length... "+startPos, startPos + fullTag.length);
                    myField.setSelectionRange(startPos+ fullTag.length, startPos+ fullTag.length);
                    updateLine($(myField).parent(), false, true);
                    closeAddedTag(myValue, fullTag);
                    //return startPos+unescape(fullTag).length;
                }

            }
            else {
                if(fullTag === ""){
                    fullTag = "<"+myValue+">";
                }
                myField.value += unescape(fullTag);
                myField.focus();
                //console.log("Last case... "+myField.selectionStart, myField.selectionStart+ fullTag.length);
                myField.setSelectionRange(myField.selectionStart+ fullTag.length, myField.selectionStart+ fullTag.length);
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
            tagIndex = $(".transcriptlet[lineserverid='"+$(this).attr("data-line")+"']").index();
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
            $(this).append("<span onclick='destroyClosingTag(this.parentNode);' class='destroyTag ui-icon ui-icon-closethick right'></span>");
        });
        $(".tags").mouseleave(function(){
            $(this).find(".destroyTag").remove();
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
        //Data.saveTranscription("");
        tpen.screen.currentFolio = canvasToJumpTo;
        if (parsing === "parsing" || tpen.screen.liveTool === "parsing"){
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
    var index = tpen.screen.colorList.indexOf(tpen.screen.colorThisTime);
    if(index + 1 === tpen.screen.colorList.length){ //We are on the last color, so the next color should be index 0.
        index = -1;
    }
    index++;
    var color = tpen.screen.colorThisTime = tpen.screen.colorList[index];
    if(index + 1 === tpen.screen.colorList.length){ //We have just changed to the last color in the list, so the color next time will be index 0.
        index = -1;
    }
    var colorNextTime = tpen.screen.colorList[index+1];
//    var oneToChange = tpen.screen.colorThisTime.lastIndexOf(")") - 2;
//    var borderColor = tpen.screen.colorThisTime.substr(0, oneToChange) + '.2' + tpen.screen.colorThisTime.substr(oneToChange + 1);
//    var lineColor = tpen.screen.colorThisTime.replace(".4", ".9"); //make this color opacity 100
    $('.lineColIndicator').css('border', '1px solid ' + color);
    $('.lineColOnLine').css({'border-left':'1px solid ' + color, 'color':color});
    $("#markerColors").css("color", colorNextTime);
    $('.activeLine').css({
//        'box-shadow' : '0px 0px 15px 8px ' + color,
        'box-shadow' : '0 0 15px black',
        'opacity' : .4
    }); //keep this color opacity .4 until imgTop is hovered.
}

/* Toggle the line/column indicators in the transcription interface. (A1, A2...) */
function toggleLineMarkers(){
    if (($('.lineColIndicator:first').is(":visible")&& $('.lineColIndicator:eq(1)').is(":visible"))
            || $("#showTheLines").hasClass("selected")){ //see if a pair of lines are visible just in case you checked the active line first.
        $('.lineColIndicator').hide();
        $(".activeLine").show().addClass("linesHidden");
        $("#showTheLines").removeClass("selected");
    }
    else {
        $('.lineColIndicator').css("display", "block");
        $(".lineColIndicator").removeClass("linesHidden");
        $("#showTheLines").addClass("selected");
        $.each($(".lineColOnLine"), function(){$(this).css("line-height", $(this).height() + "px"); });
    }
}

/* Toggle the drawn lines in the transcription interface. */
function toggleLineCol(){
    if ($('.lineColOnLine:first').is(":visible")){
        $('.lineColOnLine').hide();
        $("#showTheLabels").removeClass("selected");
    }
    else {
        $('.lineColOnLine').show();
        $("#showTheLabels").addClass("selected");
        $.each($(".lineColOnLine"), function(){$(this).css("line-height", $(this).height() + "px"); });
    }
}

function updateLinesInColumn(column, clean){
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
    batchLineUpdate(linesToUpdate, "", true);
}

/* Bulk update for lines in a column.  Also updates annotation list those lines are in with the new anno data. */
function batchLineUpdate(linesInColumn, relocate, parsing){
    var onCanvas = $("#transcriptionCanvas").attr("canvasid");
    //var currentAnnoListID = tpen.screen.currentAnnoListID;
    //var currentAnnoListResources = [];
    var lineTop, lineLeft, lineWidth, lineHeight = 0;
    var ratio = originalCanvasWidth2 / originalCanvasHeight2; //Can I use tpen.screen.originalCanvasHeight and Width?
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false, false);
        //Go over each line from the column resize.
    if(parsing){
        $.each(linesInColumn, function(i){
            var line = $(this);
            var tpenLineId = line.attr("line")
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
                "tpen_line_id" : currentLineServerID
                //"testing":"TPEN28"
            };
            var index = - 1;
            //find the line in the anno list resources and replace its position with the new line resource.
            $.each(currentAnnoList, function(){
                index++;
                if (this.tpen_line_id === currentLineServerID){
                    currentAnnoList[index] = dbLine;
                    return false;
                }
            });
            updateLine(line, false, false);
            if(i === linesInColumn.length-1){
                cleanupTranscriptlets(true);
            }
        });
    }
    else{
        //Its because I am exiting by going to a link or something, do a batch update on the dereferenced list.
        //Will this finish before the page exit?  This worked before with the bulk updater.  The bulk updater from T-PEN classic does not update text, and we need that here.
        //If it does not finish, we need to write a new bulk updater for T-PEN that will work with the SQL db that includes updating the line text. .
        var transcriptlets = $(".transcriptlet");
        for(var i=0; i<transcriptlets.length; i++){
            var currentLine = $(transcriptlets[i]);
            if(i === transcriptlets.length -1){
                updateLine(currentLine, false, false);
                if(relocate){
                    setTimeout(function(){ window.location.href=relocate; }, 800);
                }
            }
            else{
                updateLine(currentLine, false, false);
            }
        }
    }

    //Now that all the resources are edited, update the list.
//    tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources = currentAnnoList;
//    var url = "updateAnnoList";
//    var paramObj = {
//        "@id":currentAnnoListID,
//        "resources": currentAnnoList
//    };
//    var url2 = "bulkUpdateAnnos";
//    var paramObj2 = {"annos":currentAnnoList};
//    var params2 = {"content":JSON.stringify(paramObj2)};
//
//    $.post(url2, params2, function(data){ //update individual annotations
//        var params = {"content":JSON.stringify(paramObj)};
//        $.post(url, params, function(data2){ //update annotation list
//            if(relocate){
//                document.location = relocate;
//            }
//        });
//    });


}

    function drawLinesOnCanvas(lines, parsing, tool){
        var RTL = false;
        if (lines.length > 0){
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
            if(tpen.screen.mode==="RTL"){
                RTL = true;
            }
            drawLinesDesignateColumns(lines, tool, RTL, "");
        }
        else { //list has no lines
            if (parsing !== "parsing") {
                $("#noLineWarning").show();
            }
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
            $('#transcriptionCanvas').css('height', tpen.screen.originalCanvasHeight + "px");
            $('.lineColIndicatorArea').css('height', tpen.screen.originalCanvasHeight + "px");
            $("#imgTop").css("height", $("#imgTop img").height() + "px");
            $("#imgTop img").css("top", "0px");
            $("#imgBottom").css("height", "inherit");
            $("#parsingBtn").css("box-shadow", "0px 0px 6px 5px yellow");
        }
        updateURL("p");
    }

    function getList(canvas, drawFlag, parsing, preview){ //this could be the @id of the annoList or the canvas that we need to find the @id of the list for.
        var lists = [];
        var annos = [];
        var canvasIndex = 0;
        if(preview || preview === 0){
            canvasIndex = preview;
        }
        else{
            canvasIndex = tpen.screen.currentFolio;
        }
        if(tpen.manifest.sequences[0].canvases[canvasIndex].resources){ //It is classic data, no otherContent will be available, just return these lines.
            tpen.screen.dereferencedLists[canvasIndex] = tpen.manifest.sequences[0].canvases[canvasIndex].resources;
            return tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].resources;
        }
        if(tpen.screen.dereferencedLists[canvasIndex]){
            annos = tpen.screen.dereferencedLists[canvasIndex].resources;
            //tpen.screen.currentAnnoListID = tpen.screen.dereferencedLists[tpen.screen.currentFolio]["@id"];
            if(drawFlag){
                drawLinesOnCanvas(annos, parsing, tpen.screen.liveTool);
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
//                $.get(list, function(annoListData){
                    if(list.proj === parseInt(tpen.project.id)){
                        if(!preview){
                            tpen.screen.currentAnnoListID = list;
                            tpen.screen.dereferencedLists[canvasIndex] = list;
                        }
                        if (list.resources) {
                            annos = list.resources;
                            //Here is when we would set empty, but its best just to return the empty array.  Maybe get rid of "empty" check in this file.
//                            for(var l=0; l<resources.length; l++){
//                                var currentResource = resources[l];
//                                if(currentResource.on.startsWith(canvas['@id'])){
//                                     annos.push(currentResource);
//                                 }
//                            }
                        }
                        if(drawFlag){
                            drawLinesOnCanvas(annos, parsing, tpen.screen.liveTool);
                        }
                        return annos;
                    }
 //               });
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
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false, false);
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
    var currentLineText = $(line).find(".theText").val();
    var currentLineNotes = $(line).find(".notes").val();
    var currentLineTextAttr = unescape(line.attr("data-answer"));
    var currentLineNotesAttr = unescape(line.find(".notes").attr("data-answer"));
    var params = new Array({name:'submitted',value:true},{name:'folio',value:tpen.project.folios[tpen.screen.currentFolio].folioNumber},{name:'projectID',value:tpen.project.id});
    var params2 = new Array({name:'submitted',value:true},{name:'projectID',value:tpen.project.id});
    var updateContent = false;
    var updatePositions = false;
    if(tpen.screen.liveTool === "parsing"){
        //OR it was from bump line in the trasncription interface.  How do I detect that?  This is overruled below until we figure that out.
        updatePositions = true;
        updateContent = false;
        currentLineText = currentLineTextAttr = "";
        currentLineNotes = currentLineNotesAttr = "";
    }
//    var currentAnnoListID = tpen.screen.currentAnnoListID;
    var dbLine = {
        "@id" : currentLineServerID,
        "tpen_line_id" :  currentLineServerID,
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
//        "testing":"TPEN28"
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
        if (parseInt(lineID)>0 || $(line).attr("id")=="dummy"){
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

        if(tpen.screen.liveTool !== "parsing"){
            //Only update positions if parsing is active, it is the only place to change position information at this point. alt+ arrow has been removed from interface.
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
                .append("<div class='noChange'>No changes made</div>")//
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
                .append("<div class='saveLog'>"+columnMark + '&nbsp;saved&nbsp;at&nbsp;'+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+"</div>")//+", "+Data.dateFormat(date.getDate())+" "+month[date.getMonth()]+" "+date.getFullYear())
                .animate({"color":"#618797"}, 600);
               
            }
            line.attr("data-answer", currentLineText);
            line.find(".notes").attr("data-answer", currentLineNotes);
            //FIXME: REST says this should be PUT
            if(updatePositions && updateContent){
                
            }
            else{
                if(updatePositions){
                    $.post(url,params,function(){
                        console.log(line.attr("linewidth"));
                        line.attr("hasError",null);
                        markLineSaved(line);
                        $("#parsingCover").hide();
                        if(!updateContent)History.prependEntry(lineID);
                        // success
                    }).fail(function(err){
                        line.attr("hasError","Saving Failed "+err.status);
                        if(err.status === 403){
                            var theURL = window.location.href;
                            return window.location.href = "index.jsp?ref="+encodeURIComponent(theURL);
                        }
                        else{
                            $(".trexHead").show();
                            $("#genericIssue").show(1000);
                        }
                        throw err;
                    });
                }
                if(updateContent){
                    $.post(url2,params2,function(){
                        line.attr("hasError",null);
                        markLineSaved(line);
                        $("#parsingCover").hide();
                        History.prependEntry(lineID);
                        // success
                    }).fail(function(err){
                        line.attr("hasError","Saving Failed "+err.status);
                        if(err.status === 403){
                            var theURL = window.location.href;
                            return window.location.href = "index.jsp?ref="+encodeURIComponent(theURL);
                        }
                        else{
                            $(".trexHead").show();
                            $("#genericIssue").show(1000);
                        }
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
    if(!updateContent && !updatePositions){
        markLineSaved(line);
    }
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
        "tpen_line_id" : "",
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
        //"testing":"TPEN28"
    };
    var url = "updateLinePositions"; //saveNewTransLineServlet
    var params = new Array(
        {name:"newy",value:newLineTop},
        {name:"newx",value:newLineLeft},
        {name:"newwidth",value:newLineWidth},
        {name:"newheight",value:newLineHeight},
        {name:"new",value:true},
        {name:'submitted',value:true},
        {name:'folio',value:tpen.project.folios[tpen.screen.currentFolio].folioNumber},
        {name:'projectID',value:tpen.project.id}
    );
    if (onCanvas !== undefined && onCanvas !== ""){
        $.post(url, params, function(data){
            //data = JSON.parse(data);
            dbLine["@id"] = data;
            dbLine["tpen_line_id"] = data;
            newLine.attr("lineserverid", data); //data["@id"]
            $("div[newcol='" + true + "']").attr({
                "startid" : data, //dbLine["@id"]
                "endid" : data, //dbLine["@id"]
                "newcol":false
            });
            var currentFolio = tpen.screen.currentFolio;
            var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false, false);
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
                if(lineBefore){
                    updateLine(lineBefore, false, false); //This will update the line on the server.
                }
                else{
                    $("#parsingCover").hide();
                }
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
function removeLine(e, columnDelete, deleteOnly){
    $("#imageTip").hide();
    var removedLine = $(e);
    if (columnDelete){
        var lineID = "";
        removedLine.remove();
        return false;
    }
    else {
        if ($(e).attr("lineleft") == $(e).next(".parsing").attr("lineleft")) { //merge
            if(!deleteOnly){ //if user clicked to remove a line, then do not allow merging.  Only delete the last line.
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
            }
            else{
                removedLine = $(e);
                tpen.screen.isDestroyingLine = true;
            }
        }
        var params = new Array({name:"remove", value:removedLine.attr("lineserverid")});
        if(deleteOnly){
            if($(e).hasClass("deletable")){
                var cfrm = confirm("Removing this line will remove any data contained as well.\n\nContinue?");
                if (!cfrm){
                    $("#parsingCover").hide();
                    return false;
                }
                removeTranscriptlet(removedLine.attr("lineserverid"), $(e).attr("lineserverid"), true, "cover");
                removedLine.remove();
                return params;
            }
            else{
                $("#parsingCover").hide();
                return false;
            }
        }
        else{
            removeTranscriptlet(removedLine.attr("lineserverid"), $(e).attr("lineserverid"), true, "cover");
            removedLine.remove();
            return params;
        }
        
        
        
        
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
    var index = 0;
    var toUpdate = $(".transcriptlet[lineserverid='" + updatedLineID + "']");
    var removedLine2 = $(".transcriptlet[lineserverid='" + lineid + "']");
    var removedText = $(".transcriptlet[lineserverid='" + lineid + "']").find(".theText").val();
    var params = new Array({name:'submitted',value:true},{name:'projectID',value:tpen.project.id});
    var currentFolio = parseInt(tpen.screen.currentFolio);
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false, false);
    var url = "updateLinePositions";
    var lineIDToRemove = parseInt(lineid.replace("line/", ""));
    params.push({name:"remove", value:lineIDToRemove});
    if (lineid !== updatedLineID){
        //we need to make sure the height and text of the next line is updated ocrrectly
        removeNextLine = true;
        var lineAfterText = toUpdate.find("textarea").val();
        updateText = removedText + " " +lineAfterText;
        toUpdate.find(".theText").val(updateText);
//        (function(){
//            var thisValue = $(this).val();
//            if (removedText !== undefined){
//                if (removedText !== "") thisValue += (" " + removedText);
//                updateText = thisValue;
//            }
//            return thisValue;
//        });
        var lineHeightForUpdate = parseFloat(toUpdate.attr("lineheight")) + parseFloat(removedLine2.attr("lineheight"));
        toUpdate.attr("lineheight", lineHeightForUpdate);
//        tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[0].resources = currentAnnoList;
//                var paramObj = {"@id":tpen.screen.currentAnnoListID, "resources": currentAnnoList};
//                var params = {"content":JSON.stringify(paramObj)};

    }
    var lineIDToCheck = "";
    if (removeNextLine){
        lineIDToCheck = lineid;
        removedLine2.remove(); //remove the transcriptlet from UI
    }
    else{
        lineIDToCheck = updatedLineID;
        //console.log("just a remove: "+lineIDToCheck);
    }
    if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
        $.each(currentAnnoList, function(index){

            if (this.tpen_line_id === lineIDToCheck){
                //console.log("Got a match in the cached list: "+this.tpen_line_id);
                currentAnnoList.splice(index, 1);
                //var url = "updateAnnoList";
                tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[0].resources = currentAnnoList;
//                var paramObj = {"@id":tpen.screen.currentAnnoListID, "resources": currentAnnoList};
//                var params = {"content":JSON.stringify(paramObj)};
                $.post(url, params, function(data){
                    if (!removeNextLine){
                        //we only had to remove a line, we are done
                        $("#parsingCover").hide();
                    }
                    else {
                        //we removed a line, but the line after that line needs to absorb its text and height, so we need an update.  The line after is named toUpdate.
                        //console.log("Here is that update I warned about.");
                        updateLine(toUpdate, false, false);
                    }
                });
            }
        });
    }
    else if (currentAnnoList == "empty"){
        throw new Error("There is no anno list assosiated with this anno.  This is an error.");
    }
    else { // If it is classic T-PEN, we need to update canvas resources
        cosnole.warn("Detected a classic object");
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
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false, false);
    $("#parsingCover").show();
   // console.log("Remove column transcriptlets... "+lines.length);
    if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
        // if it IIIF, we need to update the list
            for (var l = lines.length - 1; l >= 0; l--){
                console.log("remove line "+l);
                var theLine = $(lines[l]);
                removeTranscriptlet(theLine.attr("lineserverid"), theLine.attr("lineserverid"), true, "");
                if (l === 0){
                    console.log("They have all been removed.  make sure to update the cached list of resources.");
                    if (recurse){
                        console.log("I recursed in remove transcriptlets, now I want to remove the column");
                        console.log(tpen.screen.nextColumnToRemove);
                        tpen.screen.nextColumnToRemove.remove();
                        destroyPage();
                    }
                    else{
                        cleanupTranscriptlets(true);
                        console.log("I am in remove transcriptlets, now I want to remove the column");
                        console.log(tpen.screen.nextColumnToRemove);
                        tpen.screen.nextColumnToRemove.remove();
                        $("#parsingCover").hide();
                    }
                    $(".parsing.deletable").remove();
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
            if(l===0){
                $(".parsing.deletable").remove();
            }
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

function preloadFolioImages(){
    for(var i=0; i<tpen.manifest.sequences[0].canvases.length; i++){
        var folioImageToGet = tpen.manifest.sequences[0].canvases[i].images[0].resource["@id"];
        if(tpen.project.folioImages[i].image === null || !tpen.project.folioImages[i].preloaded ){
            tpen.project.folioImages[i].image = new Image();
//            tpen.project.folioImages[i].image.onload = function() {
//                //the problem here is that we cannot rely on i, so we cannot set the preloaded flag here.  This is done during loadTranscriptionCanvas() instead.
//                try{
//                    //tpen.project.folioImages[i].preloaded = true;
//                    //console.log("Finished preloading an image");
//                }
//                catch(err){
//                    console.warn("Could not load an image during preload.");
//                }
//            };
            tpen.project.folioImages[i].image.src = folioImageToGet;
        }
        else{
            //console.log("Folio "+i+" already preloaded");
        }
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
       variables = variables.replace(/,/g, "&");
       return(location + "?"+variables);
}

var Data = {
    /* Save all lines on the canvas */
    saveTranscription:function(relocate){
        var linesAsJSONArray = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false, false);
        batchLineUpdate(linesAsJSONArray, relocate, false);
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
                var cfrm = confirm("You are on the last line of the page. T&#8209;PEN can save the remaining text in the linebreaking tool for later insertion. \n\nConfirm?");
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
        //Data.saveTranscription("");
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
    revealHelp: function(event){
       splitPage(event, "help");
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
        if(refIndex.startsWith("#")||refIndex.startsWith(".")){
            this.highlight($(refIndex));
            return true;
        }
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
        //UI effects for when a user decides to edit a line within the preview split tool.
    edit: function(line){
        var focusLineID = $(line).siblings(".previewLineNumber").attr("lineserverid");
        var transcriptionText = ($(line).hasClass("previewText")) ? ".theText" : ".notes";
        var pair = $(".transcriptlet[lineserverid='"+focusLineID+"']").find(transcriptionText);
        var transcriptlet = $(".transcriptlet[lineserverid='"+focusLineID+"']");
        if ($(line).hasClass("currentPage")){
            if (transcriptlet.attr('id') !== tpen.screen.focusItem[1].attr('id')){
                updatePresentation(transcriptlet);
            }
            line.focus();
            $(line).keyup(function(){
                //Data.makeUnsaved();
                pair.val($(this).text());
                transcriptlet.find(".theText").keyup();
            });
        }
        else {
            //console.log("NOt the current page.")
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
        var saveLine = $(".previewLineNumber[lineserverid='"+saveLineID+"']").parent(".previewLine");
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
                "<span class='previewLineNumber' lineserverid='",
                    $(this).attr("lineserverid"),"' data-linenumber='",
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
        var availableRoom = new Array (Page.height()-$(".navigation").height(),$("#transcriptionCanvas").width());
        var line = $(".activeLine");
        var limitIndex = (line.width()/line.height()> availableRoom[1]/availableRoom[0]) ? 1 : 0;
        var zoomRatio = (limitIndex === 1) ? availableRoom[1]/line.width() : availableRoom[0]/line.height();
        var imgDims = new Array (topImg.height(),topImg.width(),parseInt(topImg.css("left")),-line.position().top);
        if (!cancel){
            //zoom in
            if($(".parsing").size()>0){
                // Parsing tool is open
                return false;
            }
            $(".lineColIndicatorArea").fadeOut();
            tpen.screen.peekMemory = [parseFloat(topImg.css("top")),parseFloat(btmImg.css("top")),$("#imgTop").css("height")];
            //For some reason, doing $("#imgTop").height() and getting the integer value causes the interface to be broken when restored in the else below, even though it is the same value.
            $("#imgTop").css({
                "height"    : line.height() * zoomRatio + "px"
            });
            topImg.css({
                "width"     : imgDims[1] * zoomRatio + "px",
                "left"      : -line.position().left * zoomRatio,
                "top"       : imgDims[3] * zoomRatio,
                "max-width" : imgDims[1] * zoomRatio / availableRoom[1] * 100 + "%"
            });
            btmImg.css({
                "left"      : -line.position().left * zoomRatio,
                "top"       : (imgDims[3]-line.height()) * zoomRatio,
                "width"     : imgDims[1] * zoomRatio + "px",
                "max-width" : imgDims[1] * zoomRatio / availableRoom[1] * 100 + "%"
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
        window.onresize = function(event, ui){
        };
    }
    
    function detachTemplateResize(){
        if ($("#transcriptionTemplate").hasClass("ui-resizable")){
            $("#transcriptionTemplate").resizable("destroy");
        }
        //$("#transcriptionTemplate").resizable("destroy");
    }
    
    function attachTemplateResize(){
        var originalRatio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
        $("#transcriptionTemplate").resizable({
            handles:"e",
            disabled:false,
            minWidth: window.innerWidth / 2,
            maxWidth: window.innerWidth * .75,
            start: function(event, ui){
                detachWindowResize();
            },
            resize: function(event, ui) {
                var width = ui.size.width;
                var height = 1 / originalRatio * width;
                $("#transcriptionCanvas").css("height", height + "px").css("width", width + "px");
                $(".lineColIndicatorArea").css("height", height + "px");
                var splitWidth = window.innerWidth - (width + 35) + "px";
                $(".split img").css("max-width", splitWidth);
                $(".split:visible").css("width", splitWidth);
                //var newHeight1 = parseFloat($("#fullPageImg").height()) + parseFloat($("#fullpageSplit .toolLinks").height()); //For resizing properly when transcription template is resized
                //var newHeight2 = parseFloat($(".compareImage").height()) + parseFloat($("#compareSplit .toolLinks").height()); //For resizing properly when transcription template is resized
                var fullPageMaxHeight = window.innerHeight - 125; //100 comes from buttons above image and topTrim
                $("#fullPageImg").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
                $("#fullpageSplitCanvas").height($("#fullPageImg").height());
                $("#fullpageSplitCanvas").width($("#fullPageImg").width());
                var newImgBtmTop = tpen.screen.imgBottomPositionRatio * height;
                var newImgTopTop = tpen.screen.imgTopPositionRatio * height;
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

    //Must explicitly set new height and width for percentages values in the DOM to take effect.
    //with resizing because the img top position puts it up off screen a little.
    function attachWindowResize(){
        window.onresize = function(event, ui) {
            detachTemplateResize();
            var newImgBtmTop = "0px";
            var newImgTopTop = "0px";
            var ratio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
            var newCanvasWidth = $("#transcriptionCanvas").width();
            var newCanvasHeight = $("#transcriptionCanvas").height();
            var PAGEHEIGHT = Page.height();
            var PAGEWIDTH = Page.width();
            var SPLITWIDTH = $("#parsingSplit").width();
            if(tpen.screen.liveTool === 'parsing'){
                if(screen.width == $(window).width() && screen.height == window.outerHeight){
                    $(".centerInterface").css("text-align", "center").css("background-color", "#e1f4fe");
                }
                else{
                    $(".centerInterface").css("text-align", "left").css("background-color", "#e1f4fe");
                }
                if(PAGEHEIGHT <= 625){ //This is the smallest height we allow
                    newCanvasHeight = 625;
                }
                else if (PAGEHEIGHT <= tpen.screen.originalCanvasHeight){ //allow it to be as tall as possible, but not taller.
                    newCanvasHeight = PAGEHEIGHT;
                    newCanvasWidth = ratio*newCanvasHeight;
                }
                else if(PAGEHEIGHT > tpen.screen.originalCanvasHeight){ //I suppose this is possible for small images, so handle if its trying to be bigger than possible
                    newCanvasHeight = tpen.screen.originalCanvasHeight;
                    newCanvasWidth = tpen.screen.originalCanvasWidth;
                }

                if(PAGEWIDTH > 900){ //Whenever it gets less wide than this, it prioritizes height and stops resizing by width.
                    if(PAGEWIDTH < newCanvasWidth + SPLITWIDTH){ //&&tpen.screen.mode === "none
                        newCanvasWidth = PAGEWIDTH - SPLITWIDTH;
                        newCanvasHeight = 1/ratio*newCanvasWidth;
                    }
                }
                else{ //Just do nothing instead of calling it 900 wide so it defaults to the height math, maybe put a max up there too.
//                     newCanvasWidth = 900;
//                     newCanvasHeight = 1/ratio*newCanvasWidth;
                }

                $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
                $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
                $("#imgTop").css("height", newCanvasHeight + "px");
                $("#imgTop").css("width", newCanvasWidth + "px");
                $("#imgTop img").css({
                    'height': newCanvasHeight + "px",
                });
            } 
            else if (tpen.screen.liveTool === "preview"){
                $("#previewSplit").show().height(Page.height()-$("#previewSplit").offset().top).scrollTop(0); // header space
                $("#previewDiv").height(Page.height()-$("#previewDiv").offset().top);
            }
            else if(tpen.screen.liveTool !== "" && tpen.screen.liveTool!=="none"){
                newCanvasWidth = Page.width() * .55;
                var splitWidth = window.innerWidth - (newCanvasWidth + 35) + "px";
                if(tpen.screen.liveTool === "controls"){
                    newCanvasWidth = Page.width()-200;
                    splitWidth = 200;
                }
                newCanvasHeight = 1 / ratio * newCanvasWidth;
                var fullPageMaxHeight = window.innerHeight - 125; //120 comes from buttons above image and topTrim
                $(".split img").css("max-width", splitWidth);
                $(".split:visible").css("width", splitWidth);
                $("#fullPageImg").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
                $("#fullpageSplitCanvas").height(fullPageMaxHeight);
                $("#fullpageSplitCanvas").height($("#fullPageImg").height());
                $("#fullpageSplitCanvas").width($("#fullPageImg").width());
                $("#transcriptionTemplate").css("width", newCanvasWidth + "px");
                $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
                $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
                newImgTopTop = tpen.screen.imgTopPositionRatio * newCanvasHeight;
                $("#imgTop img").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
                $("#imgBottom img").css("top", newImgBtmTop + "px");
                $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
                $(".lineColIndicatorArea").css("height",newCanvasHeight+"px");

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
            tpen.screen.responsiveNavigation();
            clearTimeout(doit);
            var doit = setTimeout(attachTemplateResize, 100);
        };
    }

tpen.screen.responsiveNavigation = function(severeCheck){
    if(!severeCheck && tpen.screen.navMemory > 0 && $('.collapsed.navigation').size()){
        $('.collapsed.navigation').removeClass('collapsed severe');
        tpen.screen.navMemory = 0;
    }
    var width = Page.width();
    var contentWidth = (function(){
        var w=0;
        $('.trimSection').each(function(){
            w+=$(this).width();
        });
        return w;
    })();
    if(contentWidth>width-(7*20)){ // margin not accounted for otherwise
        // content is encroaching and will overlap
        var addClass = (severeCheck) ? "severe" : "collapsed";
        $('.navigation').addClass(addClass);
        tpen.screen.navMemory = contentWidth;
        !severeCheck && tpen.screen.responsiveNavigation(true);
    }
};

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
    /* Make call to sql to get lines and Java to build history.  See GetHistory.java */
    function getHistory(){
        var url = "getHistory";
        var folioNum = tpen.project.folios[tpen.screen.currentFolio].folioNumber;
        var params = {projectID: tpen.project.id, p:folioNum};
        $.post(url, params)
            .success(function(data){
                $("#historyListing").empty();
                var historyElem = $(data);
                $("#historyListing").append(historyElem);
            })
            .fail(function(data){
                $("#historyListing").empty(); //? good nuf for now?
                //TODO: Should we populate history with something informing failure?
            });
    }
    
    var History = {
    /**
     *  Displays the image of the line in the history tool.
     *
     *  @param x int left position of history entry
     *  @param y int top position of the history entry
     *  @param h height of the history entry
     *  @param w width of the history entry
     */
    showImage: function(x,y,h,w){
        var buffer = 30; //even is better
        var hView = $("#historyViewer");
        var hImg = hView.find("img");
        var hBookmark = $("#historyBookmark");
        //var historyRatio = hImg.height()/hImg.width();
        var historyViewHeightAdjustment = ($("#imgTop").height() / $("#transcriptionCanvas").height()) * hImg.height();
        var topAdjustment = (parseFloat($(".lineColIndicatorArea:first").css("top")) / $(".lineColIndicatorArea:first").height())  * hImg.height();
        hImg.css({
            "top" :topAdjustment +"px"
        });
        hView.css({
            "height" : historyViewHeightAdjustment + "px"
        });
//        hBookmark.css({
//            "top"   : buffer/2 +"px",
//            "left"  :x *historyRatio +"px",
//            "width" :w *historyRatio +"px",
//            "height":h *historyRatio +"px"
//        });
        y = buffer/2;
        x = x / 100;
        w = w / 100;
        h = h / 100;

        //y = y * hImg.height();
        h = h * hImg.height();
        w = w * hImg.width();
        x = x * hImg.width();

        hBookmark.css({
            "top"   : y,
            "left"  : x,
            "width" : w,
            "height": h
        });

        // size listings for balance of page for scrolling
        $("#historyListing").height(Page.height()-hView.height()-22);

    },
    /**
     *  Updates the display when hovering over an entry in the history tool.
     *
     *  @param lineid int id of the targeted line
     */
    showLine: function(lineid){
        var lineidHist = lineid.replace("line/", "");
        $("#historyBookmark").empty();
        $("#history"+lineidHist).show(0,function(){
            // persist history options
            $("#historySplit .ui-state-active").each(function(){
                $(this).removeClass("ui-state-active").click();
            });
        }).siblings(".historyLine").hide();
        var refLine = $(".transcriptlet[lineserverid='"+lineid+"']");
        History.showImage(
            parseFloat(refLine.attr("lineleft")),
            parseFloat(refLine.attr("linetop")),
            parseFloat(refLine.attr("lineheight")),
            parseFloat(refLine.attr("linewidth"))
        );
    },
    /**
     *  Replaces empty entries with an indicator.
     */
    scrubHistory: function(){
        $(".historyText,.historyNote").html(function(){
            if($(this).html().length === 0){
                return "<span style='color:silver;'> - empty - </span>";
            } else {
                return $(this).html();
            }
        })
    },
    /**
     *  Shows the changes to parsing when hovering over a history entry.
     */
    adjustBookmark: function(archive){
        var buffer = 30; //even is better
        var hView = $("#historyViewer");
        var hImg = hView.find("img");
        var historyRatio = hImg.height()/1000; //hImg.height()?
        var historyDims = [];

        //Coming from the database, these are already in pixel value, but are they correct?
        var archiveDims = {
            x:  parseInt(archive.attr("lineleft")),
            y:  parseInt(archive.attr("linetop")),
            w:  parseInt(archive.attr("linewidth")),
            h:  parseInt(archive.attr("lineheight"))
        };

        //We have the correct values for these on the #xywh= for this line in the manifest, that is where we need to gather our values.
        var JSONline = tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent[0].resources[$(".activeLine").attr("lineid")];
        var onProp = JSONline.on;
        var lineXYWH = onProp.slice(onProp.indexOf("#xywh=") + 6);
        var lineXYWHArray = lineXYWH.split(",");
        var dims = {
            x:  lineXYWHArray[0],
            y:  lineXYWHArray[1],
            w:  lineXYWHArray[2],
            h:  lineXYWHArray[3]
        };

        var delta = {
            x:  archiveDims.x - dims.x,
            y:  archiveDims.y - dims.y,
            w:  archiveDims.w - dims.w,
            h:  archiveDims.h - dims.h
        };
        //compare and build new dimensions for box

        //Just want to show the archiveDims location for the box
        $("#historyBookmark").css("border","solid thin transparent").clone().appendTo("#historyBookmark");
        $("#historyBookmark").children().css({
            "top"   : delta.y,
            "left"  : delta.x,
            "width" : archiveDims.w * historyRatio,
            "height": archiveDims.h * historyRatio,
            "box-shadow": "0 0 0 transparent",
            "border": "solid thin red"
        });
        //TODO: are these correct?
        if (Math.abs(delta.x) > 1) historyDims.push("left: ",  Math.round(archiveDims.x/dims.x*100),"%");
        if (Math.abs(delta.y) > 1) historyDims.push("top: ",   Math.round(archiveDims.y/dims.y*100),"%");
        if (Math.abs(delta.w) > 1) historyDims.push("width: ", Math.round(archiveDims.w/dims.w*100),"%");
        if (Math.abs(delta.h) > 1) historyDims.push("height: ",Math.round(archiveDims.h/dims.h*100),"%");
        archive.find(".historyDims").html(historyDims.join(" "));
    },
    /**
     *  Show only the text changes in the history tool.
     *
     *  @param button jQuery object, clicked button
     */
    textOnly: function(button){
        //toggle
        if (button.hasClass("ui-state-active")){
            button.removeClass("ui-state-active");
            $(".historyEntry").slideDown();
        } else {
            button.addClass("ui-state-active");
            $(".historyText").each(function(index){
                var collection = $(".historyText");
                var thisOne = $(this).html();
                var previousOne = (index>0) ? collection.eq(index-1).html() : "";
                if((thisOne === previousOne) || (thisOne.length === 0)){
                    // hide duplicate or empty fields
                    $(this).parent(".historyEntry").slideUp();
                }
            });
        }
        return false;
    },
    /**
     *  Show only parsing changes in the history tool.
     *
     *  @param button jQuery object, clicked button
     */
    parsingOnly: function(button) {
        //toggle
        if (button.hasClass("ui-state-active")){
            button.removeClass("ui-state-active");
            $(".historyEntry").slideDown();
        } else {
            button.addClass("ui-state-active");
            $(".historyEntry").each(function(index){
                var collection = $(".historyEntry");
                var thisOne = [$(this).attr("linewidth"),$(this).attr("lineheight"),$(this).attr("lineleft"),$(this).attr("linetop")];
                var previousOne = (index>0) ? [collection.eq(index-1).attr("linewidth"),collection.eq(index-1).attr("lineheight"),collection.eq(index-1).attr("lineleft"),collection.eq(index-1).attr("linetop")] : ["0","0","0","0"];
                if(thisOne.join("|")==previousOne.join("|")){
                    // hide duplicate or empty fields
                    $(this).slideUp();
                }
            });
        }
        return false;
    },
    /**
     *  Show notes as well in the history tool.
     *
     *  @param button jQuery object, clicked button
     */
    showNotes: function(button) {
        //toggle
        if (button.hasClass("ui-state-active")){
            button.removeClass("ui-state-active").html("Show Notes");
            $(".historyNote").slideUp();
        } else {
            button.addClass("ui-state-active").html("Hide Notes");
            $(".historyNote").slideDown();
        }
        return false;
    },
    /**
     *  Revert only the text value from the history entry.
     *
     *  @param entry jQuery object, clicked history entry
     */
    revertText: function(entry){
        //if(!isMember && !permitModify)return false;
        var historyText = entry.find(".historyText").text();
        var historyNotes = entry.find(".historyNote").text();
        //As long as it's actually the same dash
        if (historyText.indexOf("- empty -") !== -1) historyText = "";
        if (historyNotes.indexOf("- empty -") !== -1) historyNotes = "";
        var lineid = entry.parent(".historyLine").attr("id").substr(7);
        var pair = $(".transcriptlet[lineserverid='line/"+lineid+"']");
        pair.addClass("isUnsaved").find(".theText").val(historyText);
        pair.find(".notes").val(historyNotes);
        updateLine($(".transcriptlet[lineserverid='line/"+lineid+"']"), false, false);
    },
    /**
     *  Revert only the parsing value from the history entry.
     *
     *  @param entry jQuery object, clicked history entry
     */
    revertParsing: function(entry){
        var lineid = entry.parent(".historyLine").attr("id").substr(7);
        var dims = {
            width   : parseInt(entry.attr("linewidth")),
            height   : parseInt(entry.attr("lineheight")),
            left   : parseInt(entry.attr("lineleft")),
            top   : parseInt(entry.attr("linetop"))
        }
        var thisTranscriptlet = $(".transcriptlet[lineserverid='line/"+lineid+"']");
        var dummyBuild = ["<div id='dummy' style='display:none'",
        " lineserverid='line/",lineid,     "'",
        " lineleft='",   dims.left,  "'",
        " linetop='",    dims.top,   "'",
        " linewidth='",  dims.width, "'",
        " lineheight='", dims.height,"'",
        "></div>"];
        var dummy = dummyBuild.join("");
        if (thisTranscriptlet.find(".lineLeft").val() !== $(dummy).attr("lineleft")){
            //moved out of column
            var cfrm = confirm("This revision will remove this line from the column it is in.\n\nConfirm or click 'Cancel' to leave the column intact and adjust other dimensions only.");
            if (cfrm) thisTranscriptlet.find(".lineLeft").val($(dummy).attr("lineleft")).end();
        thisTranscriptlet
            .attr("lineTop", $(dummy).attr("linetop")).end()
            .attr("lineWidth" ,(dummy).attr("linewidth")).end()
            .attr("lineHeight",$(dummy).attr("lineheight"));
        } else {
        thisTranscriptlet
            .attr("lineTop",$(dummy).attr("linetop")).end()
            .attr("lineWidth", $(dummy).attr("linewidth")).end()
            .attr("lineHeight", $(dummy).attr("lineheight"));
        }
        updateLine(dummy, false, false); //Not sure this will work...
    },
    /**
     *  Reverts to values from the history entry.
     *
     *  @param entry jQuery object, clicked history entry
     */
    revertAll: function(entry){
        this.revertText(entry);
        this.revertParsing(entry);
    },
    /**
     *  Revert only the text value from the history entry.
     *
     *  @param h element, clicked history tool
     */
    revert: function(h){
        var entry = $(h).parents(".historyEntry");
        // decide which was clicked
        if($(h).hasClass("ui-icon-arrowreturnthick-1-n")){
            // revert all
            History.revertAll(entry);
        } else if($(h).hasClass("ui-icon-pencil")){
            // revert text
            History.revertText(entry);
        } else if($(h).hasClass("ui-icon-image")){
            // revert parsing
            History.revertParsing(entry);
        } else {
            // bad click capture
            console.log(h);
        }
    },
    /**
     *  Adds a history entry to the top of the tool when a line is changed.
     *
     *  @param lineid int unique id to attach to aded entry
     */
    prependEntry: function(lineid){
        var lineidHist = lineid;
        var updated = $(".transcriptlet[lineserverid='line/"+lineid+"']");
        var lineText = updated.find(".theText").val();
        var lineNotes = updated.find(".notes").val();
        if(lineText === ""){
            lineText = "<span style='color:silver;'>&#45; empty &#45;</span>"; 
        }
        if(lineNotes === ""){
            lineNotes = "<span style='color:silver;'>&#45; empty &#45;</span>";
        }
        var firstEntry = $("#history"+lineidHist).find(".historyEntry").eq(0);
        var newEntry = null;
        var historyMaker = tpen.user.fname +" "+tpen.user.lname;
        var ratio = tpen.screen.originalCanvasWidth / tpen.screen.originalCanvasHeight;
        //FIXME
        //Haberberger note: History dims is off when new entries are added, so we hide them on new entries.  After page load, the comparison works.
        //<div class='right loud historyDims'></div>  //<-- taken from next to .historyRevert 3 lines down from here. 
        var firstEntryHTML = $("<div id='newEntry' class='historyEntry ui-corner-all' linewidth='' lineheight='' lineleft='' linetop=''>\n\
                <div class='historyDate'></div><div class='historyCreator'>"+historyMaker+"</div>\n\
                <div class='right historyRevert'></div>\n\
                <div class='historyText'> "+lineText+" </div><div class='historyNote'>"+lineNotes+"</div>\n\
                <div class='historyOptions' style='display: none;'>\n\
                    <span title='Revert image parsing only' class='ui-icon ui-icon-image right'></span>\n\
                    <span title='Revert text only' class='ui-icon ui-icon-pencil right'></span>\n\
                    <span title='Revert to this version' class='ui-icon ui-icon-arrowreturnthick-1-n right'></span>\n\
                </div></div>");
        if (firstEntry.length < 1){
            // No previous versions, add a new entry entirely
            $("#history"+lineidHist).append(firstEntryHTML);
            newEntry = $("#history"+lineidHist).find("#newEntry");
            newEntry.attr("id", "");
        } 
        else {
            newEntry = firstEntryHTML;
            newEntry.insertBefore(firstEntry); //We could add to the bottom with append to the parent if we want. 
        }
        newEntry.attr({
            "linewidth" : parseInt(parseFloat(updated.attr("lineWidth")) * (10*ratio)),
            "lineheight" : parseInt(parseFloat(updated.attr("lineHeight")) * 10),
            "lineleft" : parseInt(parseFloat(updated.attr("lineLeft")) * (10*ratio)),
            "linetop" : parseInt(parseFloat(updated.attr("lineTop"))) * 10
        }).find(".historyDate").html("<span class='quiet' title='History will update when the page reloads'>Just Now</span>")
        .siblings(".historyCreator").html("<span class='quiet' title='History will update when the page reloads'>"+historyMaker+"</span>")
        .siblings(".historyText").html(lineText)
        .siblings(".historyNote").html(lineNotes)
        .siblings(".historyOptions").find("span").click(function(){History.revert(this)});
        
    },
    /**
     *  Attaches the credit for the most recent edit to the main interface.
     */
    contribution: function(){
        var lineid = tpen.screen.focusItem[1].attr('lineserverid').split("/")[1];
        $("#contribution").html($("#history"+lineid).find('.historyCreator').eq(0).text());
        if ($("#contribution").html().length == 0){
            $("#contribution").hide();
        } else {
            $("#contribution").show();
        }
    }
}


function markLineUnsaved(line){
    line.addClass("isUnsaved"); //mark on the transcriptlet.  You can find the drawn line on the screen and do something to.
}

function markLineSaved(line){
    line.removeClass("isUnsaved");
}

function dailyTip() {
    var tips = [
        "<kbd>CTRL</kbd>+<kbd>SHIFT</kbd> Use Peek-Zoom to get a closer look at the line you are on.",
        "<kbd>CTRL</kbd>+<kbd>1-9</kbd> Insert the corresponding special character at the cursor location.",
        "<kbd>CTRL</kbd>+<kbd>HOME</kbd> Jump to the first line of the current page.",
        "<kbd>CTRL</kbd>+<kbd>ALT</kbd> Hide the workspace and move the image around for a better look.",
        "<kbd>TAB</kbd> or <kbd>ALT</kbd>+<kbd>&darr;</kbd> Move forward through lines of transcription.",
        "<kbd>SHIFT</kbd>+<kbd>TAB</kbd> or <kbd>ALT</kbd>+<kbd>&uarr;</kbd> Move backward through lines of transcription.",
        "<kbd>ESC</kbd> Close any open tool & return to fullscreen transcription.",
        "<kbd>F1</kbd> Open the help tool.",
        "<kbd>+</kbd> or <kbd>-</kbd> Change the magnification while Inspecting<i class='fa fa-zoom-plus'></i>.",
        "<i class='fa fa-code'></i> Highlight your text before clicking an XML tag to wrap it.",
        "Press <kbd>ENTER</kbd> to push any text after the cursor to the next line.",
        "Change what tools appear in the transcription interface in the project settings.",
        "Add new tools in an iframe in the project settings.",
        "Attempt something against your permissions and you will see the T&#8209;PEN t-rex.",
        "Export your project as a SharedCanvas Manifest to use it in other great IIIF tools.",
        "The Walter J. Ong, SJ Center for Digital Humanities at Saint Louis University thanks you for using T&#8209;PEN.",
        "Visit the blog for news on TPEN3!"
    ];
    var thisTip = tips[Math.floor(Math.random()*tips.length)];
    $("#tip").html(thisTip);
}

function setDirectionForElements(){
    $(" .previewText,\n\
        .notes,\n\
        #notes,\n\
        .theText,\n\
        .exportText,\n\
        .exportFolioNumber,\n\
        .historyText, \n\
        #captionsText,\n\
        #contribution,\n\
        #trimTitle \n\
    ").attr("dir", "auto");
}

function checkParsingReroute(){
    if(getURLVariable('liveTool') == "parsing"){
        setTimeout(function () {
            hideWorkspaceForParsing();
            var replaceURL = replaceURLVariable("liveTool", "none");
            window.history.pushState("", "T&#8209;PEN Transcription", replaceURL);
            $(".pageTurnCover").fadeOut(1500);
        }, 800);
    }
}

//https://github.com/Teun/thenBy.js/blob/master/README.md
/* Copyright 2013 Teun Duynstee Licensed under the Apache License, Version 2.0 */
//This is a helper function for drawLinesDesignateColumns()
function firstBy(){function n(n){return n}function t(n){return"string"==typeof n?n.toLowerCase():n}
    function r(r,e){if(e="number"==typeof e?{direction:e}:e||{},"function"!=typeof r)
        {var u=r;r=function(n){return n[u]?n[u]:""}}if(1===r.length)
        {var i=r,o=e.ignoreCase?t:n;r=function(n,t){return o(i(n))<o(i(t))?-1:o(i(n))>o(i(t))?1:0}}
        return-1===e.direction?function(n,t){return-r(n,t)}:r}function e(n,t){return n=r(n,t),n.thenBy=u,n}
    function u(n,t){var u=this;return n=r(n,t),e(function(t,r){return u(t,r)||n(t,r)})}return e;
}
    

// Shim console.log to avoid blowing up browsers without it - daQuoi?
if (!window.console) window.console = {};
    if (!window.console.log) window.console.log = function () { };
