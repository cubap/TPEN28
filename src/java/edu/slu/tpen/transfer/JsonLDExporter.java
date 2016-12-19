/*
 * Copyright 2013-2014 Saint Louis University. Licensed under the
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
package edu.slu.tpen.transfer;

import java.awt.Dimension;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.slu.tpen.entity.Image.Canvas;
import imageLines.ImageCache;
import org.apache.commons.lang.StringUtils;
import org.owasp.esapi.ESAPI;
import textdisplay.Folio;
import textdisplay.Project;
import user.User;
import static edu.slu.util.LangUtils.buildQuickMap;
import static edu.slu.util.ServletUtils.getDBConnection;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import textdisplay.Annotation;

/**
 * Class which manages serialisation to JSON-LD. Builds a Map containing the
 * Project's data, and then uses Jackson to serialise it as JSON.
 *
 * @author tarkvara
 */
public class JsonLDExporter {

   /**
    * Holds data which will be serialised to JSON.
    */
   Map<String, Object> manifestData;

   /**
    * Populate a map which will contain all the relevant project information.
    *
    * @param proj the project to be exported.
    * @throws SQLException
    */
   public JsonLDExporter(Project proj, User u) throws SQLException, IOException {
      Folio[] folios = proj.getFolios();
      int projID = proj.getProjectID();
      try {
         String projName = Folio.getRbTok("SERVERURL") + "manifest/"+projID;
         manifestData = new LinkedHashMap<>();
         manifestData.put("@context", "http://www.shared-canvas.org/ns/context.json");
         manifestData.put("@id", projName + "/manifest.json");
         manifestData.put("@type", "sc:Manifest");
         manifestData.put("label", proj.getProjectName());

         Map<String, Object> pages = new LinkedHashMap<>();
         pages.put("@id", Folio.getRbTok("SERVERURL")+"manifest/"+projID + "/sequence/normal");
         pages.put("@type", "sc:Sequence");
         pages.put("label", "Current Page Order");

         List<Map<String, Object>> pageList = new ArrayList<>();
         for (Folio f : folios) {
            pageList.add(buildPage(proj.getProjectID(), projName, f, u));
         }
         pages.put("canvases", pageList);
         manifestData.put("sequences", new Object[] { pages });
      } catch (UnsupportedEncodingException ignored) {
      }
   }

   public String export() throws JsonProcessingException {
      ObjectMapper mapper = new ObjectMapper();
      return mapper.writer().withDefaultPrettyPrinter().writeValueAsString(manifestData);
   }

   /**
    * Get the map which contains the serialisable information for the given
    * page.
    *
    * @param f the folio to be exported
    * @return a map containing the relevant info, suitable for Jackson
    * serialisation
    */
   private Map<String, Object> buildPage(int projID, String projName, Folio f, User u) throws SQLException, IOException {
       
      Integer msID = f.getMSID();
      String msID_str = msID.toString();
      String canvasID = Folio.getRbTok("SERVERURL")+"canvas/"+f.getFolioNumber();
      JSONObject annotationList = new JSONObject();
      JSONArray resources_array = new JSONArray();
      annotationList.element("@type", "sc:AnnotationList");
      annotationList.element("label", canvasID+" List");
      annotationList.element("proj", projID);
      annotationList.element("on", canvasID);
      annotationList.element("@context", "http://iiif.io/api/presentation/2/context.json");
      annotationList.element("testing", "msid_creation");
      //String canvasID = projName + "/canvas/" + URLEncoder.encode(f.getPageName(), "UTF-8");
      Dimension pageDim = ImageCache.getImageDimension(f.getFolioNumber());
      String[] otherContent;
      if (pageDim == null) {
         //LOG.log(Level.INFO, "Image for {0} not found in cache, loading image...", f.getFolioNumber());
         pageDim = f.getImageDimension();
      }
      LOG.log(Level.INFO, "pageDim={0}", pageDim);

      Map<String, Object> result = new LinkedHashMap<>();
      result.put("@id", canvasID);
      result.put("@type", "sc:Canvas");
      result.put("label", f.getPageName());
      int canvasHeight = 1000;
      result.put("height", canvasHeight);
      if (pageDim != null) {
         int canvasWidth = pageDim.width * canvasHeight / pageDim.height;  // Convert to canvas coordinates.
         result.put("width", canvasWidth);
      }
      List<Object> resources = new ArrayList<>();
      List<Object> images = new ArrayList<>();
      Map<String, Object> imageAnnot = new LinkedHashMap<>();
      imageAnnot.put("@type", "oa:Annotation");
      imageAnnot.put("motivation", "sc:painting");
      Map<String, Object> imageResource = buildQuickMap("@id", String.format("%s%s&user=%s", Folio.getRbTok("SERVERURL"), f.getImageURLResize(), u.getUname()), "@type", "dctypes:Image", "format", "image/jpeg");
//      imageResource.put("iiif", ?);
      if (pageDim != null) {
         imageResource.put("height", pageDim.height ); 
         imageResource.put("width", pageDim.width ); 
      }
      imageAnnot.put("resource", imageResource);
      imageAnnot.put("on", canvasID);
      images.add(imageAnnot);
      //If this list was somehow stored in the SQL DB, we could skip calling to the store every time. 
      otherContent = Canvas.getAnnotationListsForProject(projID, canvasID, u.getUID());
      if(otherContent.length == 0){ //No list on store
         try (Connection conn = getDBConnection()) {
         try (PreparedStatement stmt = conn.prepareStatement("SELECT * FROM transcription WHERE projectID = ? AND folio = ? ORDER BY x, y")) {
            stmt.setInt(1, projID);
            stmt.setInt(2, f.getFolioNumber());
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
               int lineID = rs.getInt("id");
               Map<String, Object> lineAnnot = new LinkedHashMap<>();
               String lineURI = projName + "/line/" + lineID;
               //lineAnnot.put("@id", lineURI);
               lineAnnot.put("tpen_line_id", lineURI);
               lineAnnot.put("@type", "oa:Annotation");
               lineAnnot.put("motivation", "oad:transcribing"); 
               lineAnnot.put("resource", buildQuickMap("@type", "cnt:ContentAsText", "cnt:chars", ESAPI.encoder().decodeForHTML(rs.getString("text"))));
               lineAnnot.put("on", String.format("%s#xywh=%d,%d,%d,%d", canvasID, rs.getInt("x"), rs.getInt("y"), rs.getInt("width"), rs.getInt("height"))); 
               lineAnnot.put("testing", "msid_creation");
               resources.add(lineAnnot);
               String note = rs.getString("comment");
               lineAnnot.put("_tpen_note", note);
               int creatorID = rs.getInt("creator");
               lineAnnot.put("_tpen_creator",creatorID);
//               if (StringUtils.isNotBlank(note)) {
//                  Map<String, Object> noteAnnot = new LinkedHashMap<>();
//                  //noteAnnot.put("@id", projName + "/note/" + lineID);
//                  noteAnnot.put("@type", "oa:Annotation");
//                  noteAnnot.put("motivation", "oa:commenting");
//                  noteAnnot.put("resource", buildQuickMap("@type", "cnt:ContentAsText", "cnt:chars", note));
//                  noteAnnot.put("on", lineURI); //TODO: should this be on an @id of an annotation? If so, that complicates how i want to do the bulk.
//                  noteAnnot.put("testing", "msid_creation");
//                  resources.add(noteAnnot);
//               }
            }
            resources_array = JSONArray.fromObject(resources);
            resources_array = Canvas.bulkSaveAnnotations(resources_array);
            annotationList.element("resources", resources_array);
            String newListID = Annotation.saveNewAnnotationList(annotationList);
            annotationList.element("@id", newListID);
            otherContent = new String[1];
            otherContent[0] = newListID;
            result.put("otherContent", otherContent);
         }
        } 
      }
      else{ //could maybe break this else away, but make sure to set the otherContent field of result in the "if" if you do.
          result.put("otherContent", otherContent);
      }
      result.put("images", images);
      return result;
   }

   private static final Logger LOG = Logger.getLogger(JsonLDExporter.class.getName());
}
