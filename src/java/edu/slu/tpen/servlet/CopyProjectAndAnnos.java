/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package edu.slu.tpen.servlet;

import edu.slu.tpen.entity.Image.Canvas;
import edu.slu.tpen.servlet.util.CreateAnnoListUtil;
import static edu.slu.util.LangUtils.buildQuickMap;
import edu.slu.util.ServletUtils;
import static edu.slu.util.ServletUtils.getDBConnection;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import net.sf.json.*;
import org.apache.commons.lang.StringUtils;
import org.owasp.esapi.ESAPI;
import textdisplay.Annotation;
import textdisplay.Folio;
import textdisplay.PartnerProject;
import textdisplay.Project;

/**
 *
 * @author bhaberbe
 * 
 * Copy all project metadata and the annotation list with its annotations for each canvas (here named folio).  Makes use of Mongo Bulk operation capabilities
 * to limit the amount of necessary http connections which greatly improved speed.
 */
public class CopyProjectAndAnnos extends HttpServlet {

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    	String result = "";
    	int uID = ServletUtils.getUID(request, response);
        if(null != request.getParameter("projectID") && uID != -1){
            Integer projectID = Integer.parseInt(request.getParameter("projectID"));      
            //System.out.println("Copy project and annos for "+projectID);
            try {
                //find original project and copy to a new project. 
                Project templateProject = new Project(projectID);
                Connection conn = ServletUtils.getDBConnection();
                conn.setAutoCommit(false);
                //in this method, it copies everything about the project.
                if(null != templateProject.getProjectName())
                {
                    Project thisProject = new Project(templateProject.copyProjectWithoutTranscription(conn, uID));
                    //set partener project. It is to make a connection on switch board. 
                    thisProject.setAssociatedPartnerProject(projectID);
                    PartnerProject theTemplate = new PartnerProject(projectID);
                    thisProject.copyButtonsFromProject(conn, theTemplate.getTemplateProject());
                    thisProject.copyHotkeysFromProject(conn, theTemplate.getTemplateProject());
                    conn.commit();
                    Folio[] folios = thisProject.getFolios();
                    //System.out.println("Created a new project template.  What was the ID assigned to it: "+thisProject.getProjectID());
                    if(null != folios && folios.length > 0)
                    {
                        for(int i = 0; i < folios.length; i++)
                        {
                            System.out.println("Starting copy for canvas");
                            Folio folio = folios[i];
                            //get annotation list for each canvas
                            JSONObject annoLsQuery = new JSONObject();
                            annoLsQuery.element("@type", "sc:AnnotationList");
                            Integer msID = folio.getMSID();
                            String msID_str = msID.toString();
                            //This needs to be the same one the JSON Exporter creates and needs to be unique and unchangeable.
                            String canvasID = "";
                            // if you want to include the manuscript it is involved in, add this before canvas/.... "/MS"+msID_str+"
                            canvasID = Folio.getRbTok("SERVERURL")+"canvas/"+folio.getFolioNumber();
                            //String canvasID = Folio.getRbTok("SERVERURL") + templateProject.getProjectName() + "/canvas/" + URLEncoder.encode(folio.getPageName(), "UTF-8"); // for slu testing
                            annoLsQuery.element("on", canvasID);
                            annoLsQuery.element("proj", projectID);
                            //System.out.println(annoLsQuery.toString());
                            URL postUrlannoLs = new URL(Constant.ANNOTATION_SERVER_ADDR + "/anno/getAnnotationByProperties.action");
                            HttpURLConnection ucAnnoLs = (HttpURLConnection) postUrlannoLs.openConnection();
                            ucAnnoLs.setDoInput(true);
                            ucAnnoLs.setDoOutput(true);
                            ucAnnoLs.setRequestMethod("POST");
                            ucAnnoLs.setUseCaches(false);
                            ucAnnoLs.setInstanceFollowRedirects(true);
                            ucAnnoLs.addRequestProperty("content-type", "application/x-www-form-urlencoded");
                            ucAnnoLs.connect();
                            DataOutputStream dataOutAnnoLs = new DataOutputStream(ucAnnoLs.getOutputStream());
                            dataOutAnnoLs.writeBytes("content=" + URLEncoder.encode(annoLsQuery.toString(), "utf-8"));
                            dataOutAnnoLs.flush();
                            dataOutAnnoLs.close();
                            BufferedReader readerAnnoLs = new BufferedReader(new InputStreamReader(ucAnnoLs.getInputStream(),"utf-8"));
                            String lineAnnoLs = "";
                            StringBuilder sbAnnoLs = new StringBuilder();
//                                System.out.println("=============================");  
//                                System.out.println("Contents of annotation list starts");  
//                                System.out.println("=============================");  
                            while ((lineAnnoLs = readerAnnoLs.readLine()) != null){
//                                    System.out.println(lineAnnoLs);
                                sbAnnoLs.append(lineAnnoLs);
                            }
//                                System.out.println("=============================");  
//                                System.out.println("Contents of annotation list ends");  
//                                System.out.println("=============================");
                            readerAnnoLs.close();
                            ucAnnoLs.disconnect();
                            //transfer annotation list string to annotation list JSON Array. 
                            JSONArray ja_allAnnoLists = new JSONArray();
                            String getAnnoResponse ="";
                            try{
                               getAnnoResponse = sbAnnoLs.toString();
                            }catch(Exception e){
                               getAnnoResponse = "[]";
                            }
                            ja_allAnnoLists = JSONArray.fromObject(getAnnoResponse); //This is the list of all AnnotatationLists attached to this folio.
                            System.out.println("Found "+ja_allAnnoLists.size()+" lists");
                            JSONObject jo_annotationList = new JSONObject();
                            JSONArray new_resources = new JSONArray();
                            JSONArray resources = new JSONArray();
                           // System.out.println("SIZE OF ANNO LIST LIST    "+ja_allAnnoLists.size());
                            //For the original project...
                            if(ja_allAnnoLists.size() > 0){ //Should only be one.  If not, that is a bit strange.  
                                jo_annotationList = ja_allAnnoLists.getJSONObject(0);
                            }
                            else{
                                //We should see if this is an old project.  Check the TPEN SQL for lines and transfer.
                                List<Object> resources_list = new ArrayList<>();
                                try (PreparedStatement stmt = conn.prepareStatement("SELECT * FROM transcription WHERE projectID = ? AND folio = ? ORDER BY x, y")) {
                                   stmt.setInt(1, projectID);
                                   stmt.setInt(2, folio.getFolioNumber());
                                   ResultSet rs = stmt.executeQuery();
                                   while (rs.next()) {
                                      int lineID = rs.getInt("id");
                                      Map<String, Object> lineAnnot = new LinkedHashMap<>();
                                      String lineURI = templateProject.getProjectName() + "/line/" + lineID;
                                      //lineAnnot.put("@id", lineURI);
                                      lineAnnot.put("tpen_line_id", lineURI);
                                      lineAnnot.put("@type", "oa:Annotation");
                                      lineAnnot.put("motivation", "oad:transcribing"); 
                                      lineAnnot.put("resource", buildQuickMap("@type", "cnt:ContentAsText", "cnt:chars", ESAPI.encoder().decodeForHTML(rs.getString("text"))));
                                      lineAnnot.put("on", String.format("%s#xywh=%d,%d,%d,%d", canvasID, rs.getInt("x"), rs.getInt("y"), rs.getInt("width"), rs.getInt("height"))); 
                                      lineAnnot.put("testing", "msid_creation");
                                      resources_list.add(lineAnnot);
                                      String note = rs.getString("comment");
                                      lineAnnot.put("_tpen_note",note);
                                      int creatorID = rs.getInt("creator");
                                      lineAnnot.put("_tpen_creator",creatorID);
//                                      if (StringUtils.isNotBlank(note)) { //could make the note an annotation...
//                                         Map<String, Object> noteAnnot = new LinkedHashMap<>();
//                                         //noteAnnot.put("@id", projName + "/note/" + lineID);
//                                         noteAnnot.put("@type", "oa:Annotation");
//                                         noteAnnot.put("motivation", "oa:commenting");
//                                         noteAnnot.put("resource", buildQuickMap("@type", "cnt:ContentAsText", "cnt:chars", note));
//                                         noteAnnot.put("on", lineURI); //TODO: should this be on an @id of an annotation? If so, that complicates how i want to do the bulk.
//                                         noteAnnot.put("testing", "msid_creation");
//                                         resources_list.add(noteAnnot);
//                                      }
                                   }
                                   
                                }
                                JSONArray resources_array = JSONArray.fromObject(resources_list);
                                System.out.println("Bulk save annos from original project "+resources_array.size()+"...");
                                resources = Canvas.bulkSaveAnnotations(resources_array);
                                jo_annotationList =CreateAnnoListUtil.createEmptyAnnoList(projectID, canvasID, resources_array);
                                System.out.println("save new list for original project...");
                                Annotation.saveNewAnnotationList(jo_annotationList); 
                                //This will have pulled the data over for the original project
                            }
                            //...Now for the new project
                            System.out.println("Begin checks for new project");
                            if(jo_annotationList.size() > 0 || (null != jo_annotationList.get("resources") && !jo_annotationList.get("resources").toString().equals("[]"))){
                                try{
                                    resources = (JSONArray) jo_annotationList.get("resources");
                                }
                                catch(JSONException e){
                                    System.out.println("Could not parse resources.  Could not get annotations for copy.");
                                    //If this list can't be parsed, the copied list will have errors.  Just define it as empty as the fail.  
                                }
                                System.out.println("Bulk save resources from original annotations list "+resources.size()+"...");
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
                                    System.out.println("Batch save response does not contain JSONARRAY in new_resouces.");
                                }

                            }
                            else{
                                //System.out.println("No annotation list for this canvas.  do not call batch save.  just save empty list.");
                            }
                                       
                            //Create annotationList for new project and save into store.
                            JSONObject canvasList = CreateAnnoListUtil.createEmptyAnnoList(thisProject.getProjectID(), canvasID, new_resources);
                            canvasList.element("copiedFrom", request.getParameter("projectID"));
                            Annotation.saveNewAnnotationList(canvasList);
                            
                        }
                    }
                    //System.out.println("Copy proj and annos finished.  Whats the ID to return: "+thisProject.getProjectID());
                    //String propVal = textdisplay.Folio.getRbTok("CREATE_PROJECT_RETURN_DOMAIN"); 
                    result = "/project/" + thisProject.getProjectID();
                }
            } catch(Exception e){
                e.printStackTrace();
            }
        }else{
            response.setStatus(response.SC_FORBIDDEN);
            result = "Unauthorized or invalid project speficied.";
        }
        response.getWriter().print(result);
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        doPost(request, response);
    }
}

