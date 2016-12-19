/*
 * Copyright 2014- Saint Louis University. Licensed under the
 *	Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 * http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
package edu.slu.tpen.servlet;

import static edu.slu.util.ServletUtils.getBaseContentType;
import static edu.slu.util.ServletUtils.getUID;
import static edu.slu.util.ServletUtils.reportInternalError;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import net.sf.json.JSONObject;
import textdisplay.Folio;
import textdisplay.Hotkey;
import textdisplay.Manuscript;
import textdisplay.Metadata;
import textdisplay.Project;
import textdisplay.ProjectPermissions;
import textdisplay.TagButton;
import user.Group;
import user.User;
import utils.Tool;
import utils.UserTool;

import com.google.gson.Gson;

import edu.slu.tpen.transfer.JsonImporter;
import edu.slu.tpen.transfer.JsonLDExporter;
import java.io.OutputStreamWriter;
import java.util.logging.Level;
import java.util.logging.Logger;
import net.sf.json.JSONArray;
import net.sf.json.JSONException;

/**
 * Get tpen project. 
 * This is a transformation of tpen function to web service. It's using tpen MySQL database. 
 * @author hanyan
 */
public class GetProjectTPENServlet extends HttpServlet {
    /**
    * Handles the HTTP <code>GET</code> method, returning a JSON-LD serialisation of the
    * requested T-PEN project.
    *
    * @param request servlet request
    * @param response servlet response
    * @throws ServletException if a servlet-specific error occurs
    * @throws IOException if an I/O error occurs
    */
   @Override
   protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        int uid = getUID(request, response);
        User user = null;
        try {
            user = new User(uid);
        } catch (SQLException ex) {
            Logger.getLogger(GetProjectTPENServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
        HttpSession session = request.getSession();
        boolean isTPENAdmin = false;
        try {
            isTPENAdmin = user.isAdmin();
        } 
        catch (SQLException e) {
                e.printStackTrace();
        }
        response.setContentType("application/json; charset=UTF-8");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(response.getOutputStream(), "UTF8"), true);
        String manifest_obj_str = "";
        Gson gson = new Gson();
        Map<String, String> jsonMap = new HashMap();
        JSONObject jo_error = new JSONObject();
        JSONObject man_obj = null;
        JSONArray mans_and_restrictions = new JSONArray();
        ArrayList manuscripts_in_project = new ArrayList();
        jo_error.element("error", "No Manifest URL");
        if (uid >= 0) {
//            System.out.println("UID ================= "+uid);
            try {
//                System.out.println("project id =============== " + request.getParameter("projectID"));
                int projID = Integer.parseInt(request.getParameter("projectID"));
                Project proj = new Project(projID);
                if (proj.getProjectID() > 0) {
                    Group group = new Group(proj.getGroupID());
                    System.out.println("1");
                    ProjectPermissions pms = new ProjectPermissions(proj.getProjectID());
                    System.out.println("2");
                    jsonMap.put("projper", gson.toJson(pms));
                    
//                    System.out.println("Parameter test to receive project data / manifest");
//                    System.out.println("group Id ===== " + proj.getGroupID() + " is member " + group.isMember(uid));
//                    System.out.println("this is a tpen admin? "+isTPENAdmin);
//                    System.out.println("this is a public project? "+pms.getAllow_public_read_transcription());
                    if (group.isMember(uid) || isTPENAdmin || pms.getAllow_public_read_transcription()) { //check for public project here
                        if (checkModified(request, proj)) {
                            jsonMap.put("project", gson.toJson(proj));
                            System.out.println("3");
//                            System.out.println("project json ====== " + gson.toJson(proj));
                            int projectID = proj.getProjectID();
                            Folio[] folios = proj.getFolios();
                            JSONArray folios_array = JSONArray.fromObject(gson.toJson(folios));
                            JSONObject folio_obj = null;
                            //TODO need to get the ipr agreement status for the archive of this folio for this user 
                            
                            for(int x=0; x<folios.length; x++){
                                Integer folioNum = folios[x].getFolioNumber();
                                Manuscript forThisFolio = new Manuscript(folioNum);
                                int manID = forThisFolio.getID(); 
                                User controller = forThisFolio.getControllingUser();
                                String controllerName = "public project";
                                String archive = folios[x].getArchive();
                                String ipr_agreement = folios[x].getIPRAgreement();
                                if(null != controller){
                                    controllerName = controller.getUname();
                                }
                                folio_obj = folios_array.getJSONObject(x);
                                folio_obj.element("manuscript", manID);
                                folio_obj.element("archive", archive);
                                folio_obj.element("ipr_agreement", ipr_agreement);
                                if(user.getUname().equals(controllerName) || forThisFolio.isRestricted()){ //
                                    folio_obj.element("ipr", true); //should be true in this case because the check needs to pass
                                }
                                else{
                                    folio_obj.element("ipr", user.hasAcceptedIPR(folioNum));
                                }
                                folios_array.set(x, folio_obj);
                                JSONObject for_the_array = new JSONObject();
                                for_the_array.element("manID", Integer.toString(manID));
                                for_the_array.element("auth", "false");
                                for_the_array.element("controller", controllerName);
                                if(!manuscripts_in_project.contains(manID)){
                                    //Then this manuscript is accounted for.
                                    manuscripts_in_project.add(manID);
                                    User currentUser = user;
                                    System.out.println("Is the current user authorized?");
                                    System.out.println(forThisFolio.isAuthorized(currentUser));
                                    if(forThisFolio.isRestricted()){
                                        if(forThisFolio.isAuthorized(currentUser)){
                                            for_the_array.element("auth", "true");
                                            System.out.println("23.2");
                                        }
                                    }
                                    else{
                                        for_the_array.element("auth", "true");
                                        System.out.println("23.3");
                                    }
                                    mans_and_restrictions.add(for_the_array);
                                } 
                            }
                            
                            jsonMap.put("ls_fs", folios_array.toString());
                            System.out.println("4");
                            jsonMap.put("mans_in_project", manuscripts_in_project.toString());
                            System.out.println("20");
                            jsonMap.put("user_mans_auth",mans_and_restrictions.toString());
                            System.out.println("21");
//                            System.out.println("folios json ========== " + gson.toJson(folios));
                            JSONObject manifest = new JSONObject();                            
                            manifest_obj_str = new JsonLDExporter(proj, user).export();
                            System.out.println("5");
                           // }
                            try{ //Try to parse the manifest string
                                man_obj = JSONObject.fromObject(manifest_obj_str);
                                manifest = man_obj;
                            }
                            catch (JSONException e2){
                                jo_error.element("error", "Not a valid JSON manifest");
                                manifest = jo_error;
                            }
                            jsonMap.put("manifest", manifest.toString());
                            System.out.println("6");
                            //get project header
                            String header = proj.getHeader();
                            jsonMap.put("ph", header);
                            System.out.println("7");
                            
                            String linebreakRemainingText = proj.getLinebreakText();
                            jsonMap.put("remainingText", linebreakRemainingText);
                             System.out.println("LB");
                            //                            System.out.println("header json ======= " + gson.toJson(header));
                            //get group members
                            User[] users = group.getMembers();
                            jsonMap.put("ls_u", gson.toJson(users));
                            System.out.println("8");
//                            System.out.println("users json ========= " + gson.toJson(users));
                            //get group leader
                            User[] leaders = group.getLeader();
                            System.out.println("10");
                            // if current user is admin AND not in leaders, add them to leaders array
                            boolean isLeader = false;
                            for (User u: leaders) {
                                if (u.getUID() == uid) {
                                    isLeader = true;
                                    break;
                                }
                            }
                            Object role = session.getAttribute("role");
                            if (!isLeader) {
                                if (role != null && role.toString().equals("1")) {
                                    User currentUser = user;
                                    ArrayList<User> leaderList = new ArrayList<User>(Arrays.asList(leaders));
                                    leaderList.add(currentUser);
                                    leaders = leaderList.toArray(new User[leaderList.size()]);
                                }
                            }
//                            System.out.println("project leaders json ========= " + gson.toJson(leaders));
                            jsonMap.put("ls_leader", gson.toJson(leaders));
                            System.out.println("11");
                            //get project permission
                            
//                            System.out.println("project permission json ========= " + gson.toJson(pms));
                            //get project buttons
                            Hotkey hk = new Hotkey();
                            List<Hotkey> ls_hk = hk.getProjectHotkeyByProjectID(projectID, uid);
                            jsonMap.put("ls_hk", gson.toJson(ls_hk));
                            System.out.println("12");
//                            System.out.println("hotkey json ======= " + gson.toJson(ls_hk));
                            //get project tools
                            UserTool[] projectTools = UserTool.getUserTools(projectID);
                            jsonMap.put("projectTool", gson.toJson(projectTools));
                            System.out.println("13");
                            jsonMap.put("cuser", uid + "");
//                            System.out.println("usertools json ========= " + gson.toJson(projectTools));
                            //get user tools
                            Tool.tools[] userTools = Tool.getTools(uid);
                            jsonMap.put("userTool", gson.toJson(userTools));
                            System.out.println("14");
                            //get project metadata
                            Metadata metadata = new Metadata(proj.getProjectID());
                            jsonMap.put("metadata", gson.toJson(metadata));
                            System.out.println("15");
                            
                            String allProjectButtons = TagButton.getAllProjectButtons(projID);
                            jsonMap.put("xml", allProjectButtons);
                            System.out.println("16");
                            //get special characters
                            jsonMap.put("projectButtons", hk.javascriptToAddProjectButtonsRawData(projectID));
                            System.out.println("17");
                            response.setStatus(HttpServletResponse.SC_OK);
                            out.println(JSONObject.fromObject(jsonMap));
                        } else {
                           response.setStatus(HttpServletResponse.SC_NOT_MODIFIED);
                        }
                    } else {
                       response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                    }
                } else {
                   response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            } catch (NumberFormatException | SQLException | IOException ex) {
               throw new ServletException(ex);
            }
        } else {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
        }
   }

   
   /**
    * Handles the HTTP <code>PUT</code> method, updating a project from a plain JSON serialisation.
    *
    * @param request servlet request
    * @param response servlet response
    * @throws ServletException if a servlet-specific error occurs
    * @throws IOException if an I/O error occurs
    */
   @Override
   protected void doPut(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
      receiveJsonLD(getUID(request, response), request, response);
   }

   /**
    * {@inheritDoc}
    */
   @Override
   public String getServletInfo() {
      return "T-PEN Project Import/Export Servlet";
   }

   private static void receiveJsonLD(int uid, HttpServletRequest request, HttpServletResponse response) throws IOException {
      if (uid >= 0) {
         try {
            int projID = Integer.parseInt(request.getPathInfo().substring(1));
            Project proj = new Project(projID);
            if (proj.getProjectID() > 0) {
               if (new Group(proj.getGroupID()).isMember(uid)) {
                  if (getBaseContentType(request).equals("application/json")) {
                     new JsonImporter(proj, uid).update(request.getInputStream());
                     response.setStatus(HttpServletResponse.SC_OK);
                  } else {
                     response.sendError(HttpServletResponse.SC_UNSUPPORTED_MEDIA_TYPE, "Expecting application/json");
                  }
               } else {
                  response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
               }
            } else {
               response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
         } catch (NumberFormatException | SQLException | IOException ex) {
            reportInternalError(response, ex);
         }
      } else {
         response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
      }
   }
   

   private boolean checkModified(HttpServletRequest request, Project proj) throws SQLException {
      boolean result = true;
      long modSince = request.getDateHeader("If-Modified-Since");
      if (modSince > 0) {
         Date projMod = proj.getModification();
         result = projMod.after(new Date(modSince));
      }
      return result;
   }
}
