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

/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.owasp.esapi.ESAPI;
import textdisplay.Project;
import textdisplay.Transcription;
import user.Group;

/**
 * Update trans-line servlet. 
 * This is a transformation of tpen function to web service. It's using tpen MySQL database. 
 * @author Han Yan
 */
public class UpdateLineServlet extends HttpServlet {

    /** 
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code> methods.
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        PrintWriter out = response.getWriter();
        //System.out.println("The back says we should update a line's content");
        try {
            if (request.getParameter("text") == null) {

                response.sendError(response.SC_BAD_REQUEST);
                response.setHeader("Access-Control-Allow-Origin", "*");
                return;
            }
            String text = request.getParameter("text");
            String comment = "";
            if (request.getParameter("comment") != null) {
                comment = request.getParameter("comment");
            }
            
            HttpSession session = request.getSession();

            if (session.getAttribute("UID") == null ||request.getParameter("projectID") == null) {
                response.sendError(response.SC_FORBIDDEN);
                response.setHeader("Access-Control-Allow-Origin", "*");
               return;
            }
            int uid = Integer.parseInt(session.getAttribute("UID").toString());
            if (request.getParameter("line") == null) {

                if (request.getParameter("projectID") != null) {
                    int projectID = Integer.parseInt(request.getParameter("projectID"));
                    try {
                        Project thisProject = new Project(projectID);
                        if (new Group(thisProject.getGroupID()).isMember(uid)) {
                            thisProject.setLinebreakText(text);
                        }
                    } catch (Exception e) {
                    }
                }
            }

            if (request.getParameter("projectID") != null) {
                int projectID = Integer.parseInt(request.getParameter("projectID"));
                String line = request.getParameter("line");
                try {
                    Project thisProject = new Project(projectID);
                    if (new Group(thisProject.getGroupID()).isMember(uid)) {
                        Transcription t = new Transcription(line);
                        t.archive(); //create an archived version before making changes
                        t.setText(text);
                        t.setComment(comment);
                        t.setCreator(uid);
                        
                        out.print(ESAPI.encoder().decodeForHTML(new Transcription(line).getText() +","+ new Transcription(line).getComment()));
                        return;
                    } else {
                        response.sendError(response.SC_FORBIDDEN);
                        response.setHeader("Access-Control-Allow-Origin", "*");
                        return;
                    }
                } catch (SQLException ex) {
                    //Logger.getLogger(UpdateLine.class.getName()).log(Level.SEVERE, null, ex);
                    response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    response.setHeader("Access-Control-Allow-Origin", "*");
                }
            }
            else
            {
                String line = request.getParameter("line");
                        Transcription t;
                    try {
                    t = new Transcription(line);

                        t.setText(text);
                        t.setComment(comment);
                        out.print("success");
                        return;
                        } catch (SQLException ex) {
                    Logger.getLogger(UpdateLineServlet.class.getName()).log(Level.SEVERE, null, ex);
                }

            }


            out.print("failure");


        } finally {
            out.close();
        }
    }

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /** 
     * Handles the HTTP <code>GET</code> method.
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /** 
     * Handles the HTTP <code>POST</code> method.
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /** 
     * Returns a short description of the servlet.
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>
}
