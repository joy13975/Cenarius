using System;
using System.Web.Mvc;
using Newtonsoft.Json.Linq;
using System.Diagnostics;
using Cenarius.Models;
using System.Data.SqlClient;
using System.Web.Hosting;
using Newtonsoft.Json;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Cenarius.Controllers
{
    [Filters.GlobalErrorHandler]
    public class HomeController : Controller
    {
        private string sqlStr = "Server=tcp:cenarius.database.windows.net,1433;Initial Catalog=CenariusAppDB;Persist Security Info=False;User ID={your_username};Password={your_password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;";
        string formoPath = "~/Formo/";

        private class SqlCred
        {
            public string username { get; set; }
            public string password { get; set; }
        }

        public HomeController()
        {
            string scPath = HostingEnvironment.MapPath("~/SqlCredentials.json");
            string scStr = System.IO.File.ReadAllText(scPath);
            SqlCred sqlCreds = JsonConvert.DeserializeObject<SqlCred>(scStr);
            sqlStr = sqlStr.Replace("{your_username}", sqlCreds.username)
                .Replace("{your_password}", sqlCreds.password);
        }

        public ActionResult Index()
        {
            return View();
        }

        public ActionResult Documentation()
        {
            return new FilePathResult("~/Views/Home/Documentation.html", "text/html");
        }

        [HttpPost]
        public ActionResult UploadFormo(HttpPostedFileBase formoFile)
        {
            try
            {
                string fn = formoFile.FileName;

                // Check that file name is usable
                string[] files = Directory.GetFiles(HostingEnvironment.MapPath(formoPath));
                if (files.Where(f => Path.GetFileName(f).ToLower() == fn).Count() > 0)
                {
                    ViewData["Heading"] = "Upload Error";
                    ViewData["Message"] = "Formo name \"" + fn + "\" is taken by existing files";
                    return View("Error");
                }

                // Try parsing file to check that it's a good JSON
                StreamReader sr = new StreamReader(formoFile.InputStream);
                JObject jsonData = JObject.Parse(sr.ReadToEnd());

                // Store file
                Debug.WriteLine("Upload checks ok for \"" + fn + "\"; writing...");
                string outputPath = Path.Combine(HostingEnvironment.MapPath(formoPath), fn);
                System.IO.File.WriteAllText(outputPath, JsonConvert.SerializeObject(jsonData));
                return RedirectToAction("New", new { name = fn.Replace(".json", "")});
            }
            catch (Exception e)
            {
                ViewData["Heading"] = "Unhandled Upload Error";
                ViewData["Message"] = e.Message + "\n\n\n" + e.StackTrace;
                return View("Error");
            }
        }

        public ActionResult New(string name)
        {
            var mvcName = typeof(Controller).Assembly.GetName();
            var isMono = Type.GetType("Mono.Runtime") != null;

            ViewData["Version"] = mvcName.Version.Major + "." + mvcName.Version.Minor;
            ViewData["Runtime"] = isMono ? "Mono" : ".NET";

            string filePath = Path.Combine(HostingEnvironment.MapPath(formoPath), (name + ".json"));
            string fileContent;
            try
            {
                fileContent = System.IO.File.ReadAllText(filePath);
                JObject data = JObject.Parse(fileContent);

                ViewData["Title"] = (string)data["formi"]["title"];
                ViewData["Heading"] = (string)data["formi"]["heading"];
                ViewData["Formo"] = data.ToString(Newtonsoft.Json.Formatting.Indented);

                return View();
            }
            catch (Exception e)
            {
                ViewData["Heading"] = "Could not open specified formo: \"" + name + "\"";

                string[] files = Directory.GetFiles(HostingEnvironment.MapPath(formoPath));

                ViewData["Message"] = "Hint: did you specify a formo file name? e.g. /Home/New?name=bcu\n" +
                    "If you did, then this file does not exist on the server.\n" +
                    "If you didn't, then try specifying a formo name.\n\n" +
                    "Available formo files are: \n" +
                    string.Join(",\n", files.Select(f => Path.GetFileName(f)).ToList());
                Debug.WriteLine(e.Message + "\n\n" + e.StackTrace);
                return View("Error");
            }
        }

        [HttpPost]
        public ActionResult MakeTables(GenericJson obj)
        {
            Debug.WriteLine("Received MakeTables request");

            try
            {
                using (var conn = new SqlConnection(sqlStr))
                {
                    conn.Open();
                    new TableInitializer(conn).InitializeTables(obj.postData);
                }
            }
            catch (Exception e)
            {
                Debug.WriteLine("Failed MakeTables()");
                Debug.WriteLine(e);
                return Json(new { success = false, msg = "Failed to commit data to DB:\n" + e.Message });
            }

            return Json(new { success = true, msg = "" });
        }

        [HttpPost]
        public ActionResult Submit(GenericJson obj)
        {
            Debug.WriteLine("Received Submit request");

            try
            {
                using (var conn = new SqlConnection(sqlStr))
                {
                    conn.Open();
                    new DataCommitter(conn).CommitData(obj.postData);
                }
            }
            catch (Exception e)
            {
                Debug.WriteLine("Failed Submit()");
                Debug.WriteLine(e);
                return Json(new { success = false, msg = "Failed to commit data to DB:\n" + e.Message });
            }

            return Json(new { success = true, msg = "" });
        }
    }
}
