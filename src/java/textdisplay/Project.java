/*
 * Copyright 2011-2014 Saint Louis University. Licensed under the
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
package textdisplay;

import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.net.MalformedURLException;
import java.net.URL;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.ModelFactory;
import com.hp.hpl.jena.rdf.model.Property;
import com.hp.hpl.jena.rdf.model.RDFList;
import com.hp.hpl.jena.rdf.model.RDFNode;
import com.hp.hpl.jena.rdf.model.Resource;
import org.owasp.esapi.ESAPI;
import static edu.slu.util.ServletUtils.getDBConnection;
import user.Group;
import user.User;
import utils.UserTool;


/**
 * @author Jon Deering
 */
public class Project {

   /**
    * Defines the level of parsing TPEN will attempt to provide for a project.
    */
   public enum imageBounding {
      lines, columns, fullimage, none
   };

   int groupID;
   int projectID;
   String projectName;
   String linebreakSymbol = "-";
   private imageBounding projectImageBounding;

   /**
    * What is the preferred level of parsing for this project.
    */
   public imageBounding getProjectImageBounding() {
      return this.projectImageBounding;
   }

   /**
    * include one of the built in tools in TPEN in the display for this project (ex. preview, correct parsing)
    */
   public void addTool(String name, String url) throws SQLException {
      Connection j = null;
      PreparedStatement ps = null;
      String query = "insert into tools(name,url) values(?,?)";
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setString(1, name);
         ps.setString(2, url);
         ps.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   /**
    * exclude one of the built in tools in TPEN in the display for this project (ex. preview, correct parsing)
    */
   public void removeTool(String name, String url) throws SQLException {
      Connection j = null;
      PreparedStatement ps = null;
      String query = "delete from tools where name=? and url=?";
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setString(1, name);
         ps.setString(2, url);
         ps.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   /**
    * Not Implemented
    */
   public String[] getTools() throws SQLException {
      String[] toret = null;
      Connection j = null;
      PreparedStatement ps = null;
      String query = "select * from tools";
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
      return toret;
   }

   /**
    * Add a tool by url which can be displayed in an iframe
    */
   private void addUserTool(Connection conn, String name, String url) throws SQLException {
      UserTool ignored = new UserTool(conn, name, url, projectID);
   }

   /**
    * Add the standard latin tools to a project
    */
   private void initializeTools(Connection conn) throws SQLException {
//      addUserTool(conn, "Latin Vulgate", "http://vulsearch.sourceforge.net/cgi-bin/vulsearch");
//      addUserTool(conn, "Latin Dictionary", "http://www.perseus.tufts.edu/hopper/resolveform?lang=latin");
//      addUserTool(conn, "Enigma", "http://ciham-digital.huma-num.fr/enigma/");
   }

   /**
    * Sets the preferred level of parsing TPEN should attempt. Default is line.
    */
   public void setProjectImageBounding(imageBounding projectImageBounding) throws SQLException {
      this.projectImageBounding = projectImageBounding;
      String updateQuery = "update project set imageBounding=? where id=?";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(updateQuery);
         ps.setString(1, projectImageBounding.name());
         ps.setInt(2, projectID);
         ps.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   public String getLinebreakSymbol() {
      return linebreakSymbol;
   }

   public void setLinebreakSymbol(String linebreakSymbol) {
      this.linebreakSymbol = linebreakSymbol;
   }
   int linebreakCharacterLimit = 5000;

   public int getLinebreakCharacterLimit() {
      return linebreakCharacterLimit;
   }

   /**
    * Update the number of characters from the uploaded text the linebreak feature will give per page
    */
   public void setLinebreakCharacterLimit(int newLimit) throws SQLException {
      String query = "update project set linebreakCharacterLimit=? where projectID=?";
      Connection j = null;
      PreparedStatement updateQuery = null;
      try {
         j = DatabaseWrapper.getConnection();
         updateQuery = j.prepareStatement(query);
         updateQuery.setInt(1, newLimit);
         updateQuery.setInt(1, projectID);
         updateQuery.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(updateQuery);
      }
   }

   /**
    * Set the priority number for this project, which is used to sort the project listing. Higher is
    * displayed first
    */
   public void setProjectPriorty(int priority) throws SQLException {
      String query = "update project set priority=? where id=?";
      Connection j = null;
      PreparedStatement updateQuery = null;
      try {
         j = DatabaseWrapper.getConnection();
         updateQuery = j.prepareStatement(query);
         updateQuery.setInt(1, priority);
         updateQuery.setInt(2, projectID);
         updateQuery.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(updateQuery);
      }
   }

   public Project() {
   }

   /**
    * Create a new Project
    */
   public int getProjectID() {
      return projectID;
   }
   /*
    public int addFolio(int folioNum)
    {
    String query="insert into projectfolios";
    }*/

   /**
    * Update the Project image sequence
    */
   public void buildSequence(Folio[] orderedFolios) throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      try {
         String query = "update projectfolios set position=? where project=? and folio=?";
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);
         //qry.execute("delete from projectsequence where Project="+this.projectID);
         for (int i = 0; i < orderedFolios.length; i++) {
            qry.setInt(1, i + 1);
            qry.setInt(2, this.projectID);
            qry.setInt(3, orderedFolios[i].folioNumber);
            qry.execute();

         }
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(qry);
         }
      }

   }

   /**
    * Get the full Transcription as a single string
    */
   public String getFullDocument() throws SQLException {

      String toret = "";
      String query = "select transcription.text from transcription join folios on folios.pageNumber=transcription.folio where projectID=? order by folio,line";
      Connection j = null;
      PreparedStatement ps = null;

      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);

         ps.setInt(1, this.projectID);
         ResultSet rs = ps.executeQuery();
         while (rs.next()) {
            toret += rs.getString(1);
         }
         return toret;
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(ps);
         }
      }
   }

   /**
    * Copy the buttons from Project p to this Project, destroying an existing buttons in this Project
    */
   public synchronized void copyButtonsFromProject(Connection conn, Project p) throws SQLException {

      try (PreparedStatement table = conn.prepareStatement("CREATE TEMPORARY TABLE tmpbuttons LIKE projectbuttons")) {
         table.executeUpdate();

         try (PreparedStatement del = conn.prepareStatement("DELETE FROM projectbuttons WHERE project=?")) {
            del.setInt(1, projectID);
            del.executeUpdate();

            try (PreparedStatement ins = conn.prepareStatement("INSERT INTO tmpbuttons (SELECT * FROM projectbuttons where project=?)")) {
               ins.setInt(1, p.projectID);
               ins.executeUpdate();
               
               // Now update the Project ids.
               try (PreparedStatement upd = conn.prepareStatement("UPDATE tmpbuttons SET project=?")) {
                  upd.setInt(1, projectID);
                  upd.executeUpdate();
                  
                  try (PreparedStatement reins = conn.prepareStatement("INSERT INTO projectbuttons (SELECT * FROM tmpbuttons)")) {
                     reins.executeUpdate();
                  }
               }
            }
         }
      } finally {
         try (PreparedStatement drop = conn.prepareStatement("DROP TABLE tmpbuttons")) {
            drop.executeUpdate();
         }
      }
   }

   /**
    * Copy the character hotkeys from another project. Destryoys anything in this project.
    */
   public synchronized void copyHotkeysFromProject(Connection conn, Project p) throws SQLException {
      try (PreparedStatement table = conn.prepareStatement("CREATE TEMPORARY TABLE tmphotkeys LIKE hotkeys")) {
         table.executeUpdate();
         
         try (PreparedStatement del = conn.prepareStatement("DELETE FROM hotkeys WHERE projectID=?")) {
            del.setInt(1, projectID);
            del.executeUpdate();
            
            try (PreparedStatement ins = conn.prepareStatement("INSERT INTO tmphotkeys (SELECT * FROM hotkeys WHERE projectID=?)")) {
               ins.setInt(1, p.projectID);
               ins.executeUpdate();

               // Now update the Project ids.
               try (PreparedStatement upd = conn.prepareStatement("UPDATE tmphotkeys SET projectID=?")) {
                  upd.setInt(1, projectID);
                  upd.executeUpdate();
                  
                  try (PreparedStatement reins = conn.prepareStatement("INSERT INTO hotkeys (SELECT * FROM tmphotkeys)")) {
                     reins.executeUpdate();
                  }
               }
            }
         }
      } finally {
         try (PreparedStatement drop = conn.prepareStatement("DROP TABLE tmphotkeys")) {
            drop.executeUpdate();
         }
      }
   }

   /**
    * Modify existing transcriptions belogining to the specified user to be part of this Project
    */
   public void importData(int uid) throws SQLException {
      Connection j = null;
      PreparedStatement ps = null;
      String query = "update transcription set projectID=? where creator=? and folio=? and projectID=0";
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         Folio[] theseFolios = this.getFolios();
         for (int i = 0; i < theseFolios.length; i++) {
            ps.setInt(1, projectID);
            ps.setInt(2, uid);
            ps.setInt(3, theseFolios[i].getFolioNumber());
            ps.execute();
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }

   }

   /**
    * Create a new Project, with the specified name and group.
    */
   public Project(Connection conn, String name, int group) throws SQLException {
      if (name == null || name.length() == 0) {
         name = "new project";
      }
      try (PreparedStatement stmt = conn.prepareStatement("insert into project (name, grp, schemaURL,linebreakCharacterLimit ) values(?,?,'',5000)", PreparedStatement.RETURN_GENERATED_KEYS)) {
         stmt.setString(1, name);
         stmt.setInt(2, group);
         stmt.execute();
         ResultSet rs = stmt.getGeneratedKeys();
         if (rs.next()) {
            projectID = rs.getInt(1);
            Metadata ignored = new Metadata(conn, projectID, name);
            initializeTools(conn);
            groupID = group;
         }
      }
   }

   /**
    * Get the existing Project based on the Project ID
    */
   public Project(int projectID) throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      try {
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement("select * from project where id=?");
         qry.setInt(1, projectID);
         ResultSet rs = qry.executeQuery();
         if (rs.next()) {
            projectName = rs.getString("name");
            groupID = rs.getInt("grp");
            this.projectID = projectID;
            this.linebreakCharacterLimit = rs.getInt("linebreakCharacterLimit");
            String imageBoundingStr = rs.getString("imageBounding");
            if (imageBoundingStr.compareTo("columns") == 0) {
               this.projectImageBounding = imageBounding.columns;
            }
            if (imageBoundingStr.compareTo("fullimage") == 0) {
               this.projectImageBounding = imageBounding.fullimage;
            }
            if (imageBoundingStr.compareTo("none") == 0) {
               this.projectImageBounding = imageBounding.none;
            }
            if (imageBoundingStr.compareTo("lines") == 0) {
               this.projectImageBounding = imageBounding.lines;
            }

         }
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(qry);
         } else {
            System.err.print("Attempt to close DB connection failed, connection was null" + this.getClass().getName() + "\n");
         }
      }
   }

   /**
    * Return a listing of all tasks associated with this Project
    */
   public String listTasks() throws SQLException {
      String query = "select id from tasks where project=?";
      String toret = "";
      Connection j = null;
      PreparedStatement qry = null;
      try {
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);
         qry.setInt(1, projectID);
         ResultSet rs = qry.executeQuery();
         while (rs.next()) {
            toret += rs.getInt(1);
         }
         return toret;
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(qry);
         } else {
            System.err.print("Attempt to close DB connection failed, connection was null" + this.getClass().getName() + "\n");
         }
      }
   }

   /**
    * Retrieve the Project name from the Project Metadata
    */
   public String getProjectName() throws SQLException {
      String toret = new Metadata(this.projectID).getTitle();
 //     System.out.println("metadata from project "+this.projectID+". title must have a value or it will use project name: "+toret);
      if (toret.compareTo("") == 0) {
          System.out.println("non title, gotta get name: "+this.projectName);
         toret = this.projectName;
         if (toret == null || toret.compareTo("") == 0) {
            toret = "unknown project";
         }
         new Metadata(this.projectID).setTitle(toret);

      }
      return toret;
   }

   /**
    * @Depricated no longer implemented, renumbering project IDs isnt allowed
    */
   public void setProjectNumber(int id) {
      projectID = id;
   }

   /**
    * @Depricated in favor of storing this in the Metadata object
    */
   public void setProjectName(String projectName) {
   }

   /**
    * Return Metadata in tei p5 format for CCL
    */
   public Metadata getMetadata() throws SQLException {
      return new Metadata(this.projectID);
   }

   /**
    * Use the log to figure out when this project was last modified.
    * @return time of the last modification
    * @throws SQLException 
    */
   public Date getModification() throws SQLException {
      Date result = null;
      try (Connection conn = getDBConnection()) {
         try (PreparedStatement stmt = conn.prepareStatement("SELECT MAX(date) FROM transcription JOIN projectfolios ON transcription.folio = projectfolios.folio WHERE project = ?")) {
            stmt.setInt(1, projectID);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
               result = rs.getTimestamp(1);
            }
         }
      }
      return result != null ? result : new Date(0);
   }

   /**
    * take any existing public image parsings and save them as Project specific
    */
   private void storeImagePositions(int folio) throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      PreparedStatement insertStatement = null;
      try {
         String query = "select * from imagepositions where folio=?";
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);
         qry.setInt(1, folio);
         ResultSet rs = qry.executeQuery();
         String insertQuery = "insert into projectimagepositions(folio, project, line, top, bottom, colstart, width) values(?,?,?,?,?,?,?)";
         insertStatement = j.prepareStatement(insertQuery);
         while (rs.next()) {
            insertStatement.setInt(1, rs.getInt("folio"));
            insertStatement.setInt(3, rs.getInt("line"));
            insertStatement.setInt(4, rs.getInt("top"));
            insertStatement.setInt(5, rs.getInt("bottom"));
            insertStatement.setInt(6, rs.getInt("colstart"));
            insertStatement.setInt(7, rs.getInt("width"));
            insertStatement.setInt(2, rs.getInt("projectID"));
            insertStatement.execute();
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
         DatabaseWrapper.closePreparedStatement(insertStatement);

      }
   }

   /**
    * Get all projects with public read access ordered by project name
    */
   public static Project[] getPublicProjects() throws SQLException {
      String query = "select distinct(project.id) from project join projectpermissions on project.id=projectpermissions.projectID where projectpermissions.allow_public_read_transcription=true order by project.name desc";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);

         ResultSet rs = ps.executeQuery();
         Stack<Integer> projectIDs = new Stack();
         while (rs.next()) {
            projectIDs.push(rs.getInt("project.id"));
         }
         Project[] toret = new Project[projectIDs.size()];
         int ctr = 0;
         while (!projectIDs.empty()) {
            toret[ctr] = new Project(projectIDs.pop());
            ctr++;
         }
         return toret;
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   /**
    * Get all projects ordered by project name
    */
   public static Project[] getAllProjects() throws SQLException {
      String query = "select distinct(project.id) from project order by project.name desc";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);

         ResultSet rs = ps.executeQuery();
         Stack<Integer> projectIDs = new Stack();
         while (rs.next()) {
            projectIDs.push(rs.getInt("project.id"));
         }
         Project[] toret = new Project[projectIDs.size()];
         int ctr = 0;
         while (!projectIDs.empty()) {
            toret[ctr] = new Project(projectIDs.pop());
            ctr++;
         }
         return toret;
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   /**
    * Check to see if this project contains user uploaded manuscript images.
    */
   public Boolean containsUserUploadedManuscript() throws SQLException {
      String query = "select * from projectfolios join folios on projectfolios.folio=folios.pageNumber join manuscript on folios.msID=manuscript.id where projectfolios.project=? and manuscript.restricted=-999";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setInt(1, projectID);
         ResultSet rs = ps.executeQuery();
         if (rs.next()) {
            return true;
         }
         return false;
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   /**
    * Create a new Project with the specified leader and copes of the transcriptions, annotations, buttons,
    * and schema
    */
   public int copyProject(Connection conn, int leaderUID) throws SQLException, Exception {
      //if (containsUserUploadedManuscript()) {
      //   throw new Exception("Cannot copy a project with user uploaded images!");
      //}
      Group g = new Group(conn, projectName, leaderUID);
      Project p = new Project(conn, projectName, g.getGroupID());
      p.setFolios(conn, getFolios());
      p.copyButtonsFromProject(conn, this);
      p.copyHotkeysFromProject(conn, this);
      p.setSchemaURL(conn, getSchemaURL());

      try (PreparedStatement selectStmt = conn.prepareStatement("select * from transcription where projectID=?")) {
         selectStmt.setInt(1, projectID);

         ResultSet rs = selectStmt.executeQuery();

         try (PreparedStatement insertStmt = conn.prepareStatement("insert into transcription(folio, line, comment, text, creator, projectID,x,y,height,width) values(?,?,?,?,?,?,?,?,?,?)")) {
            while (rs.next()) {
               insertStmt.setInt(1, rs.getInt("folio"));
               insertStmt.setInt(2, rs.getInt("line"));
               insertStmt.setString(3, rs.getString("comment"));
               insertStmt.setString(4, rs.getString("text"));
               insertStmt.setInt(5, rs.getInt("creator"));
               insertStmt.setInt(6, p.projectID);
               insertStmt.setInt(7, rs.getInt("x"));
               insertStmt.setInt(8, rs.getInt("y"));
               insertStmt.setInt(9, rs.getInt("height"));
               insertStmt.setInt(10, rs.getInt("width"));
               insertStmt.execute();
            }
         }
      }
      return p.projectID;
   }
   
   /**
    * Create a new Project with the specified leader and copes of the transcriptions, annotations, buttons,
    * and schema
    * @since 2014
    */
   public int copyProjectWithoutTranscription(Connection conn, int leaderUID) throws SQLException, Exception {
      //if (containsUserUploadedManuscript()) {
      //   throw new Exception("Cannot copy a project with user uploaded images!");
      //}
      System.out.println("Creating a project template from "+projectName);
      Group g = new Group(conn, projectName, leaderUID);
      int groupID = this.getGroupID();
      //find group leaders from template group, and if they are not in the new group, add them into new group. 
      Group templateGroup = new Group(groupID);
      User[] array_users = templateGroup.getLeader();
      for(User u : array_users){
        if (!g.isMember(u.getUID())) {
            g.addMember(u.getUID());
        }
      }
      
      
      Project p = new Project(conn, projectName, g.getGroupID());
      p.setFolios(conn, getFolios());
      p.copyButtonsFromProject(conn, this);
      p.copyHotkeysFromProject(conn, this);
      p.setSchemaURL(conn, getSchemaURL());
      System.out.println("Done.  What is the ID:  "+p.projectID);
      System.out.println("Get project id method: "+p.getProjectID());

      try (PreparedStatement selectStmt = conn.prepareStatement("select * from transcription where projectID=?")) {
         selectStmt.setInt(1, projectID);

         ResultSet rs = selectStmt.executeQuery();

         try (PreparedStatement insertStmt = conn.prepareStatement("insert into transcription(folio, line, comment, text, creator, projectID,x,y,height,width) values(?,?,?,?,?,?,?,?,?,?)")) {
            while (rs.next()) {
               insertStmt.setInt(1, rs.getInt("folio"));
               insertStmt.setInt(2, rs.getInt("line"));
               insertStmt.setString(3, "");
               insertStmt.setString(4, "");
               insertStmt.setInt(5, rs.getInt("creator"));
               insertStmt.setInt(6, p.projectID);
               insertStmt.setInt(7, rs.getInt("x"));
               insertStmt.setInt(8, rs.getInt("y"));
               insertStmt.setInt(9, rs.getInt("height"));
               insertStmt.setInt(10, rs.getInt("width"));
               insertStmt.execute();
            }
         }
      }
      return p.projectID;
   }

   /**
    * Copy any transcribed text created by this user outside of this Project into this Project.
    */
   private void copyTranscriptions(int folio, int uid) throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      PreparedStatement insertStatement = null;
      try {
         String query = "select * from transcription where folio=? and creator=?";
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);
         qry.setInt(1, folio);
         qry.setInt(2, uid);
         ResultSet rs = qry.executeQuery();
         String insertQuery = "insert into transcription(folio, line, comment, text, creator, projectID values(?,?,?,?,?,?)";

         insertStatement = j.prepareStatement(insertQuery);
         while (rs.next()) {
            insertStatement.setInt(1, rs.getInt("folio"));
            insertStatement.setInt(2, rs.getInt("line"));
            insertStatement.setInt(3, rs.getInt("comment"));
            insertStatement.setInt(4, rs.getInt("text"));
            insertStatement.setInt(5, rs.getInt("creator"));
            insertStatement.setInt(6, this.projectID);
            insertStatement.execute();
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
         DatabaseWrapper.closePreparedStatement(insertStatement);

      }
   }

   /**
    * Runs line detection on predefined columns. The columns are defined as lines when this is called, so
    * you might have 2 large lines, each being a column.
    */
   public void detectInColumns(int folioNumber) throws SQLException, IOException {
      Folio f = new Folio(folioNumber);
      Line[] t = getLines(folioNumber);
      LOG.log(Level.INFO, "User specified column count {0}", t.length);
      for (int i = 0; i < t.length; i++) {
         LOG.log(Level.INFO, "Column {0},{1},{2},{3}", new Object[]{t[i].left, t[i].right, t[i].top, t[i].bottom});
      }

      Line[] linePositions = f.detectInColumns(t);

      Connection j = null;
      PreparedStatement stmt = null;
      try {
         j = DatabaseWrapper.getConnection();
         stmt = j.prepareStatement("Delete from projectimagepositions where folio=?");
         stmt.setInt(1, folioNumber);
         stmt.execute();
         Transcription[] oldTranscriptions = Transcription.getProjectTranscriptions(projectID, folioNumber);
         for (int i = 0; i < oldTranscriptions.length; i++) {
            oldTranscriptions[i].remove();
         }
         stmt = j.prepareStatement("Insert into projectimagepositions (folio,line,top,bottom,colstart,width,project) values (?,?,?,?,?,?,?)");
         if (linePositions.length == 0) {
            linePositions = t;
         }
         for (int i = 0; i < linePositions.length; i++) {
            stmt.setInt(1, folioNumber);
            stmt.setInt(2, i + 1);
            stmt.setInt(3, linePositions[i].top);
            stmt.setInt(4, linePositions[i].bottom);
            stmt.setInt(5, linePositions[i].left);
            stmt.setInt(6, linePositions[i].right);
            stmt.setInt(7, projectID);
            stmt.execute();
            Transcription tr = new Transcription(projectID, folioNumber, linePositions[i].left, linePositions[i].top, linePositions[i].getHeight(), linePositions[i].right, true);
         }
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(stmt);
         } else {
            System.err.print("Attempt to close DB connection failed, connection was null" + this.getClass().getName() + "\n");
         }

      }
   }

   /**
    * Set the linebreak text to this value, should only be used by the upload process
    */
   public void setLinebreakText(String txt) throws SQLException {
      String query = "insert into linebreakingtext (projectID,remainingText) values (?,?)";
      String deleteQuery = "delete from linebreakingtext where projectID=?";
      Connection j = null;
      PreparedStatement ps = null;
      PreparedStatement del = null;
      try {
         j = DatabaseWrapper.getConnection();
         del = j.prepareStatement(deleteQuery);
         del.setInt(1, projectID);
         del.execute();
         ps = j.prepareStatement(query);
         ps.setInt(1, projectID);
         ps.setString(2, txt);
         ps.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
         DatabaseWrapper.closePreparedStatement(del);

      }
   }

   /**
    * Set the linebreak text to this value, should only be used by the upload process
    */
   public void setHeaderText(String txt) throws SQLException {
      String query = "insert into projectheader (projectID,header) values (?,?)";
      String deleteQuery = "delete from projectheader where projectID=?";
      Connection j = null;
      PreparedStatement ps = null;
      PreparedStatement del = null;
      try {
         j = DatabaseWrapper.getConnection();
         del = j.prepareStatement(deleteQuery);
         del.setInt(1, projectID);
         del.execute();
         ps = j.prepareStatement(query);
         ps.setInt(1, projectID);
         ps.setString(2, txt);
         ps.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
         DatabaseWrapper.closePreparedStatement(del);

      }
   }

   /**
    * Update the linebreak text by removing the number of characters specified by linebreakCharacterLimit
    * and replacing those with
    returnedText
    */
   public void setLinebreakTextWithReturnedText(String returnedText) throws SQLException {
      String query = "update linebreakingtext set remainingText=? where projectID=?";
      String selectQuery = "select remainingText  from linebreakingtext where projectID=?";
      Connection j = null;
      PreparedStatement ps = null;
      PreparedStatement selectStatement = null;
      try {

         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         selectStatement = j.prepareStatement(selectQuery);
         selectStatement.setInt(1, projectID);
         ResultSet rs = selectStatement.executeQuery();
         if (rs.next()) {

            String oldValue = "";
            if (rs.getString(1).length() >= linebreakCharacterLimit) {
               oldValue = rs.getString(1).substring(this.linebreakCharacterLimit);
            }
            oldValue = returnedText + oldValue;
            ps.setInt(2, projectID);
            ps.setString(1, oldValue);
            ps.execute();
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
         DatabaseWrapper.closePreparedStatement(selectStatement);

      }
   }

   /**
    * Retrieve Project.linebreakCharacterLimit characters of from the uploaded text file
    */
   public String getLinebreakText() throws SQLException {
      String query = "select remainingText  from linebreakingtext where projectID=?";
      Connection j = null;
      PreparedStatement ps = null;
      System.out.println("Get linebreaking text for "+projectID+"!");
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setInt(1, projectID);
         ResultSet rs = ps.executeQuery();
         if (rs.next()) {
            String toret = rs.getString(1);
            if (toret.length() > this.linebreakCharacterLimit) {
               return ESAPI.encoder().encodeForHTML(toret.substring(0, this.linebreakCharacterLimit));
            }
            System.out.println("Found linebreaking text!");
            System.out.println(toret);
            return toret;
         } else {
             System.out.println("No linebreaking text found");
            return "";
         }
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(ps);
         }
      }

   }

   /**
    * Retrieve a stored header that was uploaded by the user.
    */
   public String getHeader() throws SQLException {
      String query = "select header  from projectheader where projectID=?";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setInt(1, projectID);
         ResultSet rs = ps.executeQuery();
         if (rs.next()) {
            String toret = rs.getString(1);

            return ESAPI.encoder().encodeForHTML(toret);


         } else {
            return "";
         }
      } finally {

         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);

      }

   }

   /**
    * Returns the Folio number of the most recently modified Folio, -1 if non exists
    */
   public int getLastModifiedFolio() throws SQLException {
      String query = "select folio from transcription where projectID=? order by date desc limit 1";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setInt(1, projectID);
         ResultSet rs = ps.executeQuery();
         if (rs.next()) {
            return rs.getInt(1);
         } else {
            return -1;
         }
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(ps);
         }
      }
   }

   /**
    * Get the parsed lines for this Folio that are specific to this Project
    */
   public Line[] getLines(int folio) throws SQLException, IOException {
      Connection j = null;
      PreparedStatement qry = null;
      try {
         String query = "Select * from projectimagepositions where folio=? and project=? and width>0 order by colstart,top ";
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);
         qry.setInt(1, folio);
         qry.setInt(2, this.projectID);
         ResultSet rs = qry.executeQuery();
         Stack<Line> lines = new Stack();
         while (rs.next()) {
            Line tmp = new Line(0, 0, 0, 0);
            tmp.bottom = rs.getInt("bottom");
            tmp.top = rs.getInt("top");
            tmp.left = rs.getInt("colstart");
            tmp.right = tmp.left + rs.getInt("width");
            // i++;
            //Line tmp = new Line(rs.getInt("colstart"), rs.getInt("colstart") + rs.getInt("width"), rs.getInt("top"), rs.getInt("top") + rs.getInt("bottom"));
            lines.add(tmp);
         }
         Line[] toret = new Line[lines.size()];
         for (int i = 0; i < toret.length; i++) {
            toret[i] = lines.get(i);
         }
         //if there wasnt anything specific to this Project, get whatever is public, if that doesnt exist either, itll parse the image, store it public, and pass it here
         if (toret.length == 0) {
            return new Folio(folio, true).getlines();
         }
         return toret;
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(qry);
         } else {
            System.err.print("Attempt to close DB connection failed, connection was null" + this.getClass().getName() + "\n");
         }
      }
   }

   /**
    * Build a string of option elements, one for each Folio element in the Project
    */
   public String getFolioDropdown() throws SQLException {
      String toret = "";
      Folio[] allFolios = getFolios();
      for (int i = 0; i < allFolios.length; i++) {

         toret += "<option value=\"" + allFolios[i].getFolioNumber() + "&projectID=" + this.projectID + "\">" + allFolios[i].getCollectionName() + " " + allFolios[i].getPageName() + "</option>";
      }
      return toret;
   }

   /**
    * Get the list of folios for this Transcription Project
    */
   public Folio[] getFolios() throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      try {
         Stack<Folio> t = new Stack();
         String query = "select * from projectfolios where project=? order by position";
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);
         qry.setInt(1, this.projectID);
         ResultSet rs = qry.executeQuery();
         while (rs.next()) {
            t.add(new Folio(false, rs.getInt("folio")));
         }
         Folio[] toret = new Folio[t.size()];
         for (int i = 0; i < t.size(); i++) {
            toret[i] = t.get(i);
         }
         return toret;
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(qry);
         } else {
            System.err.print("Attempt to close DB connection failed, connection was null" + this.getClass().getName() + "\n");
         }
      }
   }

   /**
    * Publish image parshings from this Project, so anyone else using the images will recieve the corrected parsing.
    */
   public void publishImageParsings() throws SQLException {
      String query = "select * from imagepositions where projectID=?";
      String query2 = "select * from imagepositions where folio=? and line=? and projectID=0";
      Connection j = null;
      PreparedStatement ps = null;
      PreparedStatement ps2 = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps2 = j.prepareStatement(query2);
         ps.setInt(1, projectID);
         ResultSet rs = ps.executeQuery();
         while (rs.next()) {
            ps2.setInt(1, rs.getInt("folio"));
            ps2.setInt(2, rs.getInt("line"));
            ResultSet rs2 = ps2.executeQuery();
            if (rs2.next()) {
               //update the existing record
            } else {
               //insert a new Line position
            }

         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
         DatabaseWrapper.closePreparedStatement(ps2);
      }
   }

   /**
    * Update the parsing of an image all at once.
    */
   public void update(int[] linePositions, int[] linePositions2, int[] linePositions3, int[] linePositions4, int pagenumber) {
      // Arrays.sort(linePositions);
      Line[] newLines = new Line[linePositions.length];
      for (int i = 0; i < linePositions.length; i++) {
         Line tmp = new Line(0, 0, 0, 0);
         tmp.top = linePositions[i];
         tmp.bottom = linePositions4[i];
         tmp.left = linePositions2[i];
         tmp.right = linePositions3[i];
         newLines[i] = tmp;
      }

      Connection j = null;
      PreparedStatement stmt = null;
      try {
         j = DatabaseWrapper.getConnection();
         stmt = j.prepareStatement("Delete from projectimagepositions where folio=? and project=?");
         stmt.setInt(1, pagenumber);
         stmt.setInt(2, projectID);
         stmt.execute();
         stmt = j.prepareStatement("Insert into projectimagepositions (folio,line,top,bottom,colstart,width,project, linebreakSymbol) values (?,?,?,?,?,?,?,?)");
         for (int i = 0; i < linePositions.length; i++) {
            stmt.setInt(1, pagenumber);
            stmt.setInt(2, i + 1);
            stmt.setInt(3, newLines[i].top);
            stmt.setInt(4, newLines[i].bottom);
            stmt.setInt(5, newLines[i].left);
            stmt.setInt(6, newLines[i].right);
            stmt.setInt(7, this.projectID);
            stmt.setString(8, this.linebreakSymbol);
            stmt.execute();
         }
      } catch (SQLException ex) {
         Logger.getLogger(Project.class.getName()).log(Level.SEVERE, null, ex);
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(stmt);
      }

   }

   /**
    * Create an array of folios for the Folio numbers in the map
    */
   public Folio[] makeFolioArray(Map<String, String[]> m) throws SQLException {
      Set<String> e = m.keySet();
      Iterator<String[]> items = m.values().iterator();
      String[] names = new String[e.size()];
      int ctr = 0;
      while (items.hasNext()) {
         names[ctr] = items.next()[0];
         ctr++;
      }
      Stack<Folio> allFolios = new Stack();
      for (int i = 0; i < m.size(); i++) {
         try {
            Folio f = new Folio(Integer.parseInt(names[i]));
            allFolios.add(f);
         } catch (NumberFormatException er) {
         }
      }
      Folio[] toret = new Folio[allFolios.size()];
      for (int i = 0; i < toret.length; i++) {
         toret[i] = allFolios.get(i);
      }
      return toret;
   }

   /**
    * Get a list of images as html checkboxes.
    */
   public String checkBoxes() throws SQLException {
      String toret = "";
      Folio[] folios = this.getFolios();
      for (int i = 0; i < folios.length; i++) {
         toret += "<input type=\"checkbox\" name=\"" + folios[i].getFolioNumber() + "\" id=\"" + folios[i].getFolioNumber() + "\" checked value=\"" + folios[i].getFolioNumber() + "\"/>" + folios[i].getImageName() + "<br>\n";
      }
      return toret;
   }

   /**
    * Store the list of folios for this Project
    */
   public void setFolios(Connection conn, Folio[] f) throws SQLException {
      
      try (PreparedStatement deletionStmt = conn.prepareStatement("Delete from projectfolios where project=?")) {
         deletionStmt.setInt(1, projectID);
         deletionStmt.executeUpdate();
         
         try (PreparedStatement insertionStmt = conn.prepareStatement("insert into projectfolios (project, folio, position) values(?,?,?)")) {
            insertionStmt.setInt(1, projectID);
            for (int i = 0; i < f.length; i++) {
               if (f[i] != null) {
                  insertionStmt.setInt(2, f[i].getFolioNumber());
                  insertionStmt.setInt(3, i + 1);
                  insertionStmt.executeUpdate();
               }
            }
         }
      }
   }

   /**
    * Number of images in this project
    */
   int folioCount() throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      try {
         String query = "select count(folio) from projectfolios where project=?";
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);

         return 0;
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(qry);
         } else {
            System.err.print("Attempt to close DB connection failed, connection was null" + this.getClass().getName() + "\n");
         }
      }
   }

   /**
    * Return a list of Project members with the number of lines transcribed by each
    */
   public String getProgress() throws SQLException {
      String toret = "";
      User[] users = new Group(this.groupID).getMembers();
      String query = "select count(id) from transcription where projectID=? and creator=? and text!=''";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         for (int i = 0; i < users.length; i++) {
            ps.setInt(1, projectID);
            ps.setInt(2, users[i].getUID());
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
               toret += "<span class=\"progress\">" + users[i].getFname() + " " + users[i].getLname() + " " + rs.getInt(1) + "<br></span>";
            }
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }

      return toret;
   }

   /**
    * Return a count of lines transcribed
    */
   public int getNumberOfTranscribedLines() throws SQLException {
      int toret = 0;
      String query = "select count(id) from transcription where projectID=? and text!=''";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setInt(1, projectID);
         ResultSet rs = ps.executeQuery();
         if (rs.next()) {
            toret++;
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
      return toret;
   }

   public void setGroupID(int id) {
      groupID = id;
   }

   public int getGroupID() {
      return groupID;
   }

   /**
    * Check for tags used in the transcription that arent part of the schema. This is can be used to warn
    * users during pipeline export that they are including unsupported tags without expecting the document
    * to be fully schema compliant.
    */
   public String[] hasTagsOutsideSchema() throws SQLException, MalformedURLException, IOException {
      Stack<String> badTags = new Stack();
      String[][] res = TagButton.getTagsFromSchema(this, new ArrayList());
      String[] usedTags = new TagFilter(Manuscript.getFullDocument(this, Boolean.FALSE)).getTags();
      for (int i = 0; i < usedTags.length; i++) {
         Boolean found = false;
         for (int j = 0; j < res.length; j++) {
            if (usedTags[i].compareTo(res[j][0]) == 0) {
               found = true;
            }
         }
         if (!found) {
            badTags.push(usedTags[i]);
         }
      }
      String[] toret = new String[badTags.size()];
      for (int i = 0; i < toret.length; i++) {
         toret[i] = badTags.pop();
      }
      return toret;
   }

   /**
    * Return the partner Project, or null if the record couldnt be located
    */
   public PartnerProject getAssociatedPartnerProject() throws SQLException {
      String query = "select partner from project where id=?";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setInt(1, projectID);
         ResultSet rs = ps.executeQuery();
         if (rs.next() && rs.getInt(1) > 0) {
            return new PartnerProject(rs.getInt(1));
         }
         return null;
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   /**
    * Associate this project with a project pipeline. This changes the character hotkeys, buttons, and
    * schema and adds a user to this project.
    */
   public void setAssociatedPartnerProject(int id) throws SQLException {
      String query = "update project set partner=? where id=?";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setInt(1, id);
         ps.setInt(2, projectID);
         ps.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   /**
    * Returns all projects connected to a partner Project, or null if none
    */
   public static Project[] getAllAssociatedProjects(int id) throws SQLException {
      Project[] all;
      String query = "select id from project where partner=? ";
      Connection j = null;
      PreparedStatement ps = null;
      Stack<Project> tmp = new Stack();
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ps.setInt(1, id);
         ResultSet rs = ps.executeQuery();
         while (rs.next()) {
            tmp.push(new Project(rs.getInt(1)));
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
      all = new Project[tmp.size()];
      //odd looking way of doing this copy, I know, but it was convenient
      while (!tmp.empty()) {
         all[tmp.size() - 1] = tmp.pop();
      }
      return all;
   }

   /**
    * Returns all projects updated in the last 2 months, or null if none
    */
   public static Project[] getAllActiveProjects() throws SQLException {
      Project[] active;
      String query = "SELECT DISTINCT projectid FROM transcription WHERE DATE > ( NOW( ) + INTERVAL -2 MONTH )";
      Connection j = null;
      PreparedStatement ps = null;
      Stack<Project> tmp = new Stack();
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement(query);
         ResultSet rs = ps.executeQuery();
         while (rs.next()) {
            tmp.push(new Project(rs.getInt(1)));
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
      active = new Project[tmp.size()];
      //odd looking way of doing this copy, I know, but it was convenient
      while (!tmp.empty()) {
         active[tmp.size() - 1] = tmp.pop();
      }
      return active;
   }

   /**
    * Build a new Project with the values stored herein, useful when using this class as a bean
    */
   public int build() {
      try (Connection conn = getDBConnection()) {
         int toret = new Project(conn, projectName, groupID).projectID;
         return toret;
      } catch (SQLException ex) {
         return 0;
      }
   }

   /**
    * Delete the Project information for this Project. Does not delete the underlying data, as Im sure the
    * next request Ill get is to undelete something...returns false if it failed to delete for some reason.
    */
   public Boolean delete() throws SQLException {
      if (this.projectID > 0) {
         String query = "delete from project where id=?";
         Connection j = null;
         PreparedStatement qry = null;
         try {
            j = DatabaseWrapper.getConnection();
            qry = j.prepareStatement(query);
            qry.setInt(1, projectID);

            qry.execute();
            return true;
         } finally {
            if (j != null) {
               DatabaseWrapper.closeDBConnection(j);
            }
            DatabaseWrapper.closePreparedStatement(qry);
         }
      }
      return false;
   }

   /**
    * @Depricated use the constructor instead
    */
   public void fetch() throws SQLException {
      if (this.projectID != 0) {
         Connection j = null;
         PreparedStatement qry = null;
         try {
            j = DatabaseWrapper.getConnection();
            qry = j.prepareStatement("select * from project where id=?");
            qry.setInt(1, projectID);
            ResultSet rs = qry.executeQuery();
            if (rs.next()) {
               projectName = rs.getString("name");
               groupID = rs.getInt("grp");
            }
         } finally {
            if (j != null) {
               DatabaseWrapper.closeDBConnection(j);
               DatabaseWrapper.closePreparedStatement(qry);
            } else {
               System.err.print("Attempt to close DB connection failed, connection was null" + this.getClass().getName() + "\n");
            }
         }
      }
   }

   /**
    * returns -1 if an error occurs, probably due to deletion or the lack of folios.
    */
   public int firstPage() throws SQLException {
      // @TODO:  If there're no folios, this throws an ArrayIndexOutOfBoundsException.
      try {
         return getFolios()[0].getFolioNumber();
      } catch (NullPointerException | ArrayIndexOutOfBoundsException ex) {
         LOG.log(Level.SEVERE, "Error loading first page for project " + projectID, ex);
         return -1;
      }
   }

   /**
    * Get the unique identifier of the next page image to be displayed according to the sequence being used
    * by this Project
    */
   public int getFollowingPage(int current) throws SQLException {
      Folio[] fols = this.getFolios();
      for (int i = 0; i < fols.length; i++) {
         if (fols[i].getFolioNumber() == current && i + 1 < fols.length) {
            return (fols[i + 1].folioNumber);
         }
      }
      return 0;
   }

   /**
    * Get the unique identifier of the previous page image according to the sequence being used by this Project
    */
   public int getPreceedingPage(int current) throws SQLException {
      Folio[] fols = this.getFolios();
      for (int i = 0; i < fols.length; i++) {
         if (fols[i].getFolioNumber() == current && i != 0) {
            return (fols[i - 1].folioNumber);
         }
      }
      return 0;
   }

   /**
    * Build OAC annotations our of the lines transcription
    */
   public String getOAC(int folioNumber) throws SQLException, IOException {
      Model model = ModelFactory.createDefaultModel();
      Transcription[] transcriptions = Transcription.getProjectTranscriptions(projectID, folioNumber);
      for (int i = 0; i < transcriptions.length; i++) {
         StringReader r = new StringReader(transcriptions[i].getAsOAC());
         model.read(r, "");

      }
      StringWriter w = new StringWriter();
      model.write(w, "N3");

      return w.toString();
   }

   /**
    * @Depricated this code needs to be updated to build a sequence after the changes to OAC
    */
   public String getOACSequence() throws SQLException {
      Model model = ModelFactory.createDefaultModel();
      model.setNsPrefix("dms", "http://dms.stanford.edu/ns/");
      model.setNsPrefix("oac", "http://www.openannotation.org/ns/");
      model.setNsPrefix("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
      model.setNsPrefix("ore", "http://www.openarchives.org/ore/terms/");
      model.setNsPrefix("cnt", "http://www.w3.org/2008/content#");
      model.setNsPrefix("dc", "http://purl.org/dc/elements/1.1/");
      model.setNsPrefix("dcterms", "http://purl.org/dc/terms/");

      Folio[] fols = this.getFolios();
      Resource sequence = model.createResource("http://t-pen.org/sequences/");
      Property rdfType = model.createProperty("http://www.w3.org/1999/02/22-rdf-syntax-ns#", "type");
      RDFList l = model.createList(new RDFNode[]{sequence});
      Property aggregates = model.createProperty("http://www.openarchives.org/ore/terms/", "aggregates");
      for (int i = 0; i < fols.length; i++) {
         Resource view = model.createResource("http://t-pen.org/views/" + fols[i].folioNumber);
         view.addProperty(rdfType, view);
         sequence.addProperty(aggregates, view);
         l.add(view);
      }
      StringWriter tmp = new StringWriter();
      model.write(tmp);
      return tmp.getBuffer().toString();
   }

   /**
    * Add a new Project log comment
    */
   public void addLogEntry(Connection conn, String text, int uid) throws SQLException {
      try (PreparedStatement deleteStmt = conn.prepareStatement("delete from projectlog where content=? and uid=? and projectID=?")) {
         deleteStmt.setInt(3, projectID);
         deleteStmt.setInt(2, uid);
         deleteStmt.setString(1, text);
         deleteStmt.executeUpdate();
         
         try (PreparedStatement insertStmt = conn.prepareStatement("insert into projectlog(projectID, uid, content) values(?,?,?)")) {
            insertStmt.setInt(1, projectID);
            insertStmt.setInt(2, uid);
            insertStmt.setString(3, text);
            insertStmt.executeUpdate();
         }
      }
   }

   /**
    * Retrieve the log of Project comments in order by date.
    */
   public String getProjectLog() throws SQLException {
      String query = "select content,creationDate,uid from projectlog where projectID=? order by creationDate desc limit 1000";
      StringBuilder toret = new StringBuilder("");
      Connection j = null;
      PreparedStatement qry = null;
      try {
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);
         qry.setInt(1, projectID);
         ResultSet rs = qry.executeQuery();
         while (rs.next()) {
            User u = new User(rs.getInt("uid"));
            SimpleDateFormat d = new SimpleDateFormat();
            toret.append("<div class=\"logEntry\"><div class=\"logDate\">").append(d.format(rs.getTimestamp("creationDate"))).append("</div>");
            toret.append("<div class=\"logAuthor\">").append(ESAPI.encoder().encodeForHTML(u.getFname() + " " + u.getLname())).append("</div>");
            //removed esapi encoding 
            toret.append("<div class=\"logContent\">").append(rs.getString("content")).append("</div></div>");
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
      }
      return toret.toString();
   }

   /**
    * Retrieve the requested number of Project comments in order by date, from date.
    */
   public String getProjectLog(int recordCount, int firstRecord) throws SQLException {
      String query = "select content,creationDate,uid from projectlog where projectID=? order by creationDate desc limit ?,?";
      StringBuilder toret = new StringBuilder("");
      Connection j = null;
      PreparedStatement qry = null;
      try {
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement(query);
         qry.setInt(1, projectID);
         qry.setInt(2, firstRecord);
         qry.setInt(3, recordCount);
         ResultSet rs = qry.executeQuery();
         while (rs.next()) {
            User u = new User(rs.getInt("uid"));
            SimpleDateFormat d = new SimpleDateFormat();
            toret.append("<div class=\"logEntry\"><div class=\"logDate\">").append(d.format(rs.getTimestamp("creationDate"))).append("</div>");
            toret.append("<div class=\"logAuthor\">").append(ESAPI.encoder().encodeForHTML(u.getFname() + " " + u.getLname())).append("</div>");
            //removed esapi encoding to allow links in entries
            toret.append("<div class=\"logContent\">").append(rs.getString("content")).append("</div></div>");
         }
      } finally {
         if (j != null) {
            DatabaseWrapper.closeDBConnection(j);
         }
         DatabaseWrapper.closePreparedStatement(qry);
      }
      return toret.toString();
   }

   /**
    * Retrieve the requested number of Project comments in order by date.
    */
   public String getProjectLog(int recordCount) throws SQLException {
      return getProjectLog(recordCount, 0);
   }

   public String getSchemaURL() throws SQLException {
      String toret = "";
      Connection j = null;
      PreparedStatement ps = null;
      try {
         j = DatabaseWrapper.getConnection();
         ps = j.prepareStatement("select schemaURL from project where id=?");
         ps.setInt(1, this.projectID);
         ResultSet rs = ps.executeQuery();
         if (rs.next()) {
            return rs.getString("schemaURL");
         }
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);

      }
      return toret;
   }

   /**
    * Update the project URL.  If it's not a valid URL (typically because it's an empty string), we just
    * smother the exception.
    */
   public void setSchemaURL(Connection conn, String newURL) throws SQLException {
      try {
         URL schemaURL = new URL(newURL);
         try (PreparedStatement ps = conn.prepareStatement("update project set schemaURL=? where id=?")) {
            ps.setInt(2, this.projectID);
            ps.setString(1, newURL);
            ps.executeUpdate();
         }
      } catch (MalformedURLException ignored) {
      }
   }
   
   private static final Logger LOG = Logger.getLogger(Project.class.getName());
}
