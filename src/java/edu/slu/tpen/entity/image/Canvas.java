/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package edu.slu.tpen.entity.Image;

import static com.hp.hpl.jena.assembler.Assembler.connection;
import static com.hp.hpl.jena.vocabulary.TestManifest.result;
import edu.slu.tpen.servlet.Constant;
import static edu.slu.util.LangUtils.buildQuickMap;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import net.sf.json.JSONArray;
import net.sf.json.JSONException;
import net.sf.json.JSONObject;
import org.owasp.esapi.ESAPI;
import textdisplay.Annotation;
import textdisplay.Transcription;

/**
 *
 * @author hanyan
 */
public class Canvas {
    private String objectId;
    //for reference in the sc:AnnotationList
    private String id;
    private String type;
    private Integer height;
    private Integer width;
    private List<Image> ls_images;
    private List<OtherContent> ls_otherContent;

    public Canvas() {
    }

    public Canvas(String id, Integer height, Integer width, List<Image> ls_images, List<OtherContent> ls_otherContent) {
        this.id = id;
        this.height = height;
        this.width = width;
        this.ls_images = ls_images;
        this.ls_otherContent = ls_otherContent;
    }
    
    public JSONObject toJSON(){
        JSONObject jo = new JSONObject();
        jo.element("@id", this.id);
        jo.element("@type", this.type);
        jo.element("height", this.height);
        jo.element("width", this.width);
        JSONArray ja_images = new JSONArray();
        for(Image i : ls_images){
            ja_images.add(i.toJSON());
        }
        jo.element("images", ja_images);
        JSONArray ja_otherContent = new JSONArray();
        for(OtherContent oc : ls_otherContent){
            ja_otherContent.add(oc.toJSON());
        }
        jo.element("otherContent", ja_otherContent);
        return jo;
    }

    /**
     * @return the id
     */
    public String getId() {
        return id;
    }

    /**
     * @param id the id to set
     */
    public void setId(String id) {
        this.id = id;
    }

    /**
     * @return the type
     */
    public String getType() {
        return type;
    }

    /**
     * @param type the type to set
     */
    public void setType(String type) {
        this.type = type;
    }

    /**
     * @return the height
     */
    public Integer getHeight() {
        return height;
    }

    /**
     * @param height the height to set
     */
    public void setHeight(Integer height) {
        this.height = height;
    }

    /**
     * @return the width
     */
    public Integer getWidth() {
        return width;
    }

    /**
     * @param width the width to set
     */
    public void setWidth(Integer width) {
        this.width = width;
    }

    /**
     * @return the ls_images
     */
    public List<Image> getLs_images() {
        return ls_images;
    }

    /**
     * @param ls_images the ls_images to set
     */
    public void setLs_images(List<Image> ls_images) {
        this.ls_images = ls_images;
    }

    /**
     * @return the ls_otherContent
     */
    public List<OtherContent> getLs_otherContent() {
        return ls_otherContent;
    }

    /**
     * @param ls_otherContent the ls_otherContent to set
     */
    public void setLs_otherContent(List<OtherContent> ls_otherContent) {
        this.ls_otherContent = ls_otherContent;
    }

    /**
     * Load annotations on this canvas for this project.
     * @param projectID : the projectID the canvas belongs to
     * @param canvasID: The canvas ID the annotation list is on
     * @param folioNumber : The folio ID on this canvas
     * @param UID: The current UID of the user in session.
     * @return : The annotation lists @id property, not the object.  Meant to look like an otherContent field.
     */
    public static JSONArray getLinesForProject(Integer projectID, String canvasID, Integer folioNumber, Integer UID) throws MalformedURLException, IOException, SQLException {
        JSONObject parameter = new JSONObject();
        JSONObject annotationList = new JSONObject();
        JSONArray resources_array = new JSONArray();
        annotationList.element("@type", "sc:AnnotationList");
        annotationList.element("label", canvasID+" List");
        annotationList.element("proj", projectID);
        annotationList.element("on", canvasID);
        annotationList.element("@context", "http://iiif.io/api/presentation/2/context.json");
        annotationList.element("testing", "msid_creation");
        Transcription[] lines;
        parameter.element("@type", "sc:AnnotationList");
        if(projectID > -1){
            parameter.element("proj", projectID);
        }
        parameter.element("on", canvasID);
        lines = Transcription.getProjectTranscriptions(projectID, folioNumber);
        int numberOfLines = lines.length;
        List<Object> resources = new ArrayList<>();
        for (int i = 0; i < numberOfLines; i++) {
            if (lines[i] != null) {    
                int lineID = lines[i].getLineID();
                Map<String, Object> lineAnnot = new LinkedHashMap<>();
                String lineURI = "line/" + lineID;
                //lineAnnot.put("@id", lineURI);
                lineAnnot.put("tpen_line_id", lineURI);
                lineAnnot.put("@type", "oa:Annotation");
                lineAnnot.put("motivation", "oad:transcribing"); 
                lineAnnot.put("resource", buildQuickMap("@type", "cnt:ContentAsText", "cnt:chars", ESAPI.encoder().decodeForHTML(lines[i].getText())));
                lineAnnot.put("on", String.format("%s#xywh=%d,%d,%d,%d", canvasID, lines[i].getX(), lines[i].getY(), lines[i].getWidth(), lines[i].getHeight())); 
                lineAnnot.put("_tpen_note", lines[i].getComment());
                lineAnnot.put("_tpen_creator",lines[i].getCreator());
                resources.add(lineAnnot);
            }
        }
        resources_array = JSONArray.fromObject(resources);
//            String newListID = Annotation.saveNewAnnotationList(annotationList);
//            annotationList.element("@id", newListID);
        annotationList.element("resources", resources_array);
        JSONArray annotationLists = new JSONArray();
        annotationLists.add(annotationList); // Only one in this version.
        return annotationLists;
}
    
    /**
     * Check the annotation store for the annotation list on this canvas for this project.
     * @param projectID : the projectID the canvas belongs to
     * @param canvasID: The canvas ID the annotation list is on
     * @param UID: The current UID of the user in session.
     * @return : The annotation lists @id property, not the object.  Meant to look like an otherContent field.
     */
    public static String[] getAnnotationListsForProject(Integer projectID, String canvasID, Integer UID) throws MalformedURLException, IOException {
        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/getAnnotationByProperties.action");
        JSONObject parameter = new JSONObject();
        parameter.element("@type", "sc:AnnotationList");
        if(projectID > -1){
            parameter.element("proj", projectID);
        }
        parameter.element("on", canvasID);
        //System.out.println("Get anno list for proj "+projectID+" on canvas "+canvasID);
        HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setRequestMethod("POST");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        connection.connect();
        DataOutputStream out = new DataOutputStream(connection.getOutputStream());
        //value to save
        out.writeBytes("content=" + URLEncoder.encode(parameter.toString(), "utf-8"));
        out.flush();
        out.close(); // flush and close
        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
        String line="";
        StringBuilder sb = new StringBuilder();
        while ((line = reader.readLine()) != null){
            //line = new String(line.getBytes(), "utf-8");
            sb.append(line);
        }
        reader.close();
        connection.disconnect();
        //FIXME: Every now and then, this line throws an error: A JSONArray text must start with '[' at character 1 of &lt
        JSONArray theLists = JSONArray.fromObject(sb.toString());
        //System.out.println("Found "+theLists.size()+" lists matching those params.");
        String[] annotationLists = new String[theLists.size()];
        for(int i=0; i<theLists.size(); i++){
            JSONObject currentList = theLists.getJSONObject(i);
            String id = currentList.getString("@id");
           // System.out.println("List ID: "+id);
            annotationLists[i] = id;
        }
        //System.out.println("Return this array");
        //System.out.println(Arrays.toString(annotationLists));
        return annotationLists;
    }
    
    /* 
    @param resources: A JSON array of annotations that are all new (insert can be used).  
    @return A JSONArray of annotations with their @id included.

    The resources need to be saved and a JSON array of the objects with their @ids in them needs
    to be returneds.
    */
    public static JSONArray bulkSaveAnnotations(JSONArray resources) throws MalformedURLException, IOException{
        JSONArray new_resources = new JSONArray();
        URL postUrlCopyAnno = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/batchSaveFromCopy.action");
        HttpURLConnection ucCopyAnno = (HttpURLConnection) postUrlCopyAnno.openConnection();
        ucCopyAnno.setDoInput(true);
        ucCopyAnno.setDoOutput(true);
        ucCopyAnno.setRequestMethod("POST");
        ucCopyAnno.setUseCaches(false);
        ucCopyAnno.setInstanceFollowRedirects(true);
        ucCopyAnno.addRequestProperty("content-type", "application/x-www-form-urlencoded");
        ucCopyAnno.connect();
        DataOutputStream dataOutCopyAnno = new DataOutputStream(ucCopyAnno.getOutputStream());
        String str_resources = "";
        if(resources.size() > 0){
            str_resources = resources.toString();
        }
        else{
            str_resources = "[]";
        }
        dataOutCopyAnno.writeBytes("content=" + URLEncoder.encode(str_resources, "utf-8"));
        dataOutCopyAnno.flush();
        dataOutCopyAnno.close();
        BufferedReader returnedAnnoList = new BufferedReader(new InputStreamReader(ucCopyAnno.getInputStream(),"utf-8"));
        String lines = "";
        StringBuilder sbAnnoLines = new StringBuilder();
        while ((lines = returnedAnnoList.readLine()) != null){
//                                    System.out.println(lineAnnoLs);
            sbAnnoLines.append(lines);
        }
        returnedAnnoList.close();
        String parseThis = sbAnnoLines.toString();
        JSONObject batchSaveResponse = JSONObject.fromObject(parseThis);
        try{
            new_resources = (JSONArray) batchSaveResponse.get("new_resources");
        }
        catch(JSONException e){
           // System.out.println("Batch save response does not contain JSONARRAY in new_resouces.");
        }
        
        return new_resources;
    }
    
    /* 
    @param resources: A JSON array of annotations that are all new (insert can be used).  
    @return A JSONArray of annotations with their @id included.

    The resources need to be saved and a JSON array of the objects with their @ids in them needs
    to be returned.
    */
    public static JSONArray bulkUpdateTranscriptlets(JSONArray resources) throws MalformedURLException, IOException{
        JSONArray new_resources = new JSONArray();
        URL postUrlCopyAnno = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/batchSaveMetadataForm.action");
        HttpURLConnection ucCopyAnno = (HttpURLConnection) postUrlCopyAnno.openConnection();
        ucCopyAnno.setDoInput(true);
        ucCopyAnno.setDoOutput(true);
        ucCopyAnno.setRequestMethod("POST");
        ucCopyAnno.setUseCaches(false);
        ucCopyAnno.setInstanceFollowRedirects(true);
        ucCopyAnno.addRequestProperty("content-type", "application/x-www-form-urlencoded");
        ucCopyAnno.connect();
        DataOutputStream dataOutCopyAnno = new DataOutputStream(ucCopyAnno.getOutputStream());
        String str_resources = "";
        if(resources.size() > 0){
            str_resources = resources.toString();
        }
        else{
            str_resources = "[]";
        }
        dataOutCopyAnno.writeBytes("content=" + URLEncoder.encode(str_resources, "utf-8"));
        dataOutCopyAnno.flush();
        dataOutCopyAnno.close();
        BufferedReader returnedAnnoList = new BufferedReader(new InputStreamReader(ucCopyAnno.getInputStream(),"utf-8"));
        String lines = "";
        StringBuilder sbAnnoLines = new StringBuilder();
        while ((lines = returnedAnnoList.readLine()) != null){
//                                    System.out.println(lineAnnoLs);
            sbAnnoLines.append(lines);
        }
        returnedAnnoList.close();
        String parseThis = sbAnnoLines.toString();
        JSONObject batchSaveResponse = JSONObject.fromObject(parseThis);
        try{
            new_resources = (JSONArray) batchSaveResponse.get("reviewed_resources");
        }
        catch(JSONException e){
           // System.out.println("Batch save response does not contain JSONARRAY in new_resouces.");
        }
        return new_resources;
    }
}


