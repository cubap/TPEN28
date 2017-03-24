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

/* Gather the annotations for a canvas and populate the preview interface with them. */
function gatherAndPopulate(currentOn, pageLabel, currentPage, i){
    var annosURL = "getAnno";
    var properties = {"@type": "sc:AnnotationList", "on" : currentOn};
    var paramOBJ = {"content": JSON.stringify(properties)};
    $.post(annosURL, paramOBJ, function(annoList){
        annoList = JSON.parse(annoList);
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
    $("#projectsBtn").attr("href", "project.jsp?projectID="+pid);
    $("#transTemplateLoading").show();
if (pid.indexOf("http://") >= 0 || pid.indexOf("https://") >= 0) {
        var url = pid;
        tpen.project.id = -1; //This means it is not a T-PEN project, but rather a manifest from another source.
        $.ajax({
            url: url,
            success: function(m){
                tpen.manifest = m;
                if (m.sequences[0] !== undefined
                    && m.sequences[0].canvases !== undefined
                    && m.sequences[0].canvases.length > 0){
                    transcriptionFolios = m.sequences[0].canvases;
                    scrubFolios();
                    var count = 1;
                    $.each(transcriptionFolios, function(index){
                        $("#pageJump").append("<option folioNum='" + count
                            + "' class='folioJump' val='" + this.label + "'>"
                            + this.label + "</option>");
                        count++;
                        if (this.otherContent){
                            if (this.otherContent.length > 0){
                                // all's well
                                $.each(transcriptionFolios[index].otherContent,function(jndex){
                                    if(!transcriptionFolios[index].otherContent[jndex]['@id']){
                                        console.warn("Missing `@id` on otherContent:", transcriptionFolios[index].otherContent[jndex]);
                                        transcriptionFolios[index].otherContent[jndex]['@id']="temp_"+index+"_"+jndex;
                                    }
                                });
                            }
                            else {
                                //otherContent was empty (IIIF says otherContent
                                //should have URI's to AnnotationLists).
                                console.warn("`otherContent` exists, but has no content.");
                            }
                        }
                        else {
                            this.otherContent=[];
                            console.warn("`otherContent` does not exist in this Manifest.");
                        }
                    });
                    loadTranscriptionCanvas(transcriptionFolios[canvasIndex], "", tool);
                    var projectTitle = m.label;
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
    //Move up all image annos
    var cnt = - 1;
    if (canvasObj.images[0].resource['@id'] !== undefined && canvasObj.images[0].resource['@id'] !== ""){ //Only one image
        var image = new Image();
        //Check to see if we can use a preloaded image...
        image.onload = function(){
            $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
            $("#imgTop img, #imgBottom img").css("width", "100%");
            $("#imgBottom").css("height", "inherit");
                $('.transcriptionImage').attr('src', canvasObj.images[0].resource['@id'].replace('amp;', ''));
                //FIXME At some point I had to track tpen.screen.originalCanvasHeight differently.  Not sure that
                //I need to anymore, test making these tpen.screen.* and see what happens.
                originalCanvasHeight2 = $("#imgTop img").height();
                originalCanvasWidth2 = $("#imgTop img").width();
                tpen.screen.originalCanvasHeight = $("#imgTop img").height();
                tpen.screen.originalCanvasWidth =  $("#imgTop img").width();
                drawLinesToCanvas(canvasObj, parsing, tool);
                $("#transcriptionCanvas").attr("canvasid", canvasObj["@id"]);
                $("#transcriptionCanvas").attr("annoList", canvasAnnoList);
                tpen.screen.textSize();
                focusOnLastModified();
                updatePageLabels(pageTitle);
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
                alert("No image for this canvas or it could not be resolved.  Not drawing lines.");
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
    }
    tpen.screen.textSize();
}
/* 
 * Take line data, turn it into HTML elements and put them to the DOM 
 * The lines come from the back end in LTR order.  The function
 * must figure out line#s and column letters.  Only supporting
 * top to bottom && (LTR || RTL)
 * */
function drawLinesDesignateColumns(lines){
    $(".lineColIndicatorArea").empty(); //Clear the lines that are drawn off the screen.  This is in case of an interface toggle.
    $(".transcriptlet").remove(); //Clear out the transcriptlets, they are being redrawn.
    $("#noLineWarning").hide();
    var letterIndex = 0;
    var letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I",
                   "J", "K", "L", "M", "N", "O", "P", "Q", "R",
                   "S", "T", "U", "V", "W", "X", "Y", "Z"];
    var update = true;
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
        colCounter++;
    }
    if (update && $(".transcriptlet").eq(0).length > 0){
        focusOnLastModified();
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
    $("#transTemplateLoading").hide(); //if we drew the lines, this can disappear.;
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
        var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
        updateLine(lineToUpdate, false, true);
        updatePresentation($('#transcriptlet_' + lineid));
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
            var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
            updateLine(lineToUpdate, false, true);
            updatePresentation($('#transcriptlet_' + nextID));
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
            var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
            updateLine(lineToUpdate, false, false);
            updatePresentation($('#transcriptlet_' + prevID));
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
    tpen.screen.isUnadjusted = tpen.screen.isFullscreen = true;
    if ($("#transcriptionTemplate").hasClass("ui-resizable")){
        $("#transcriptionTemplate").resizable('destroy');
    }
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
    $("#fullScreenBtn").fadeOut(250);
    tpen.screen.isZoomed = false;
    restoreWorkspace();
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

/* Change the page to the specified page from the drop down selection. */
function pageJump(page, parsing){
    var canvasToJumpTo = parseInt(page);; //0,1,2...
    if (tpen.screen.currentFolio !== canvasToJumpTo && canvasToJumpTo >= 0){ //make sure the default option was not selected and that we are not jumping to the current folio
        //Data.saveTranscription("");
        tpen.screen.currentFolio = canvasToJumpTo;
            tpen.screen.currentFolio = canvasToJumpTo;
            tpen.screen.focusItem = [null, null];
            redraw("");
    }
    else{
    }
}

    function drawLinesOnCanvas(lines, parsing, tool){
        if (lines.length > 0){
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
            drawLinesDesignateColumns(lines);
        }
        else { //list has no lines
            $("#noLineWarning").show();
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
            $('#transcriptionCanvas').css('height', tpen.screen.originalCanvasHeight + "px");
            $('.lineColIndicatorArea').css('height', tpen.screen.originalCanvasHeight + "px");
            $("#imgTop").css("height", $("#imgTop img").height() + "px");
            $("#imgTop img").css("top", "0px");
            $("#imgBottom").css("height", "inherit");
        }
    }

    function getList(canvas, drawFlag){ //this could be the @id of the annoList or the canvas that we need to find the @id of the list for.
        var lists = [];
        var annos = [];
        var canvasIndex = 0;
            canvasIndex = tpen.screen.currentFolio;
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
                            tpen.screen.currentAnnoListID = list;
                            tpen.screen.dereferencedLists[canvasIndex] = list;
                        if (list.resources) {
                            annos = list.resources;
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
    var on_base = $("#transcriptionCanvas").attr("canvasid");
    var annoList_resources = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], false, false, false);
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
    var xywh_values = lineLeft + "," + lineTop + "," + lineWidth + "," + lineHeight;
    var currentLineServerID = line.attr('lineserverid');
    var text = $(line).find(".theText").val();
    var notes = $(line).find(".notes").val();

    var oaAnnotation = {
        "@id" : currentLineServerID,
        "@type" : "oa:Annotation",
        "motivation" : ["sc:painting","rr:transcribing","rr:unpublished"],
        "resource" : {
            "@type" : "cnt:ContentAsText",
            "cnt:chars" : text
        },
        "on" : on_base + "#xywh=" + xywh_values,
        "_tpen" : {"forProject": tpen.manifest['@id'],notes:notes,line_id:currentLineServerID},
        "_rerum": {sandbox:true}
    };
    clearTimeout(typingTimer);
    var saveAndUpdate = function(anno,index,idOnly){
        saveLine(anno,function(res){
                        console.log(res);
                        // res is object, but not header, so .done
                    }).done(function(res){
                        var newID;
                        try{
                        // res is jqXHR now, location header is the updated or created RERUM URI
                        newID = res.getHeader("Location");
                        } catch (err) {
                            newID = "ERROR"+err.status+Date.now();
                        }
                        anno['@id'] = newID;
                        tpen.screen.dereferencedLists[tpen.screen.currentFolio].resources[index] =
                        ( idOnly ) ? newID : anno;
                });
    };
            for(var i=0  ;i < annoList_resources.length; i++){
                if(annoList_resources[i]["@id"] === oaAnnotation['@id']
                || annoList_resources[i].tpen_line_id === oaAnnotation._tpen.line_id ){
                    // This is the match.
                    saveAndUpdate(oaAnnotation,i);
                    break;
                } else if (annoList_resources[i] === oaAnnotation['@id']
                || annoList_resources[i] === oaAnnotation._tpen.line_id ){
                    // This is a reference match.
                    saveAndUpdate(oaAnnotation,i,true);
                    break;
                }
            }
}
function saveReportMessage(msg,isError){
    var log = $("#saveReport");
    log.stop(true,true);
    var report = $("<div>").html(msg);
    if(isError){
        report.addClass('noChange');
        log.append(report).animate({"color":"#618797"}, 1600,function(){$("#saveReport").find(".noChange").remove();});
    } else {
        report.addClass('saveLog');
        log.append(report).animate({"color":"#618797"}, 600);
    }
}

function saveLine(anno, callback){
    console.log("TODO: SAVE LINE!");
    // TODO: Connect to Rerum-cloud
    var url = "https://rerum-cloud-cubap.c9users.io";
    var api = "/res/line";
    if(anno['@id']&&anno['@id'].indexOf('://'>-1)){
        var aid = anno['@id'].substr(anno['@id'].lastIndexOf("/")+1);
        // id in the store already
        return $.ajax({
            url:url+api+"/"+aid,
            data:anno,
            method:'PUT'});
    } else {
        // new line
        return $.post(url+api,anno);
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
            }
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

/* Re draw transcriptlets from the Annotation List information. */
function cleanupTranscriptlets(draw) {
    var transcriptlets = $(".transcriptlet");
    if (draw){
        transcriptlets.remove();
        $(".lineColIndicatorArea").children(".lineColIndicator").remove();
            fullPage();
            drawLinesToCanvas(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio], "");
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
        var img = new Image();
        img.src = folioImageToGet;
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
                myfield.value = myfield.value.substring(0, startPos);
                $(nextfield).parent(".transcriptlet").addClass("isUnsaved");
                tpen.screen.focusItem[1].find(".nextLine").click();
            }
        }
        //Data.saveTranscription("");
        return false;
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
                newCanvasWidth = Page.width();
                newCanvasHeight = 1 / ratio * newCanvasWidth;
                var fullPageMaxHeight = window.innerHeight - 125; //120 comes from buttons above image and topTrim
                $("#transcriptionTemplate").css("width", newCanvasWidth + "px");
                $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
                $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
                newImgTopTop = tpen.screen.imgTopPositionRatio * newCanvasHeight;
                $("#imgTop img").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
                $("#imgBottom img").css("top", newImgBtmTop + "px");
                $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
                $(".lineColIndicatorArea").css("height",newCanvasHeight+"px");

            $.each($(".lineColOnLine"),function(){
                $(this).css("line-height", $(this).height()+"px");
            });
            tpen.screen.textSize();
            tpen.screen.responsiveNavigation();
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
