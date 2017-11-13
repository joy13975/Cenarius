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
using Cenarius.Libraries;

namespace Cenarius.Controllers
{
    [Filters.GlobalErrorHandler]
    public class HomeController : Controller
    {

        public HomeController()
        {
            try
            {
                string scPath = HostingEnvironment.MapPath("~/SqlCredentials.json");
                string scStr = System.IO.File.ReadAllText(scPath);
                Utility.SetSqlUserPwd(JsonConvert.DeserializeObject<Utility.SqlCred>(scStr));
            }catch(Exception e)
            {
                Debug.WriteLine(e.Message);
                Debug.WriteLine(e.StackTrace);
                Debug.WriteLine("Couuld not parse SqlCrendentials.json properly. " +
                    "Did you forget to create a custom file containing your SQL username and password from " +
                    "SqlCrendentials.json.example? (See documentation - Setup)");

                Environment.Exit(1);
            }
        }

        public ActionResult Index()
        {
            return View();
        }

        public ActionResult Search(string name)
        {
            return View(new SearchViewModel(name));
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
                string[] files = Directory.GetFiles(HostingEnvironment.MapPath(Utility.FormoPath));
                if (files.Where(f => Path.GetFileName(f).ToLower() == fn).Count() > 0)
                {
                    ViewData["Heading"] = "Upload Error";
                    ViewData["Message"] = "Formo name \"" + fn + "\" is taken by existing files";
                    return View("Error");
                }

                // Try parsing file to check that it's a good JSON
                StreamReader sr = new StreamReader(formoFile.InputStream);
                JObject jsonData = JObject.Parse(sr.ReadToEnd());
                string test_table_name = (string)jsonData["formi"]["table_name"];

                // TODO: check that no other formo has the same table_name

                // Store file
                Debug.WriteLine("Upload checks ok for \"" + fn + "\"; writing...");
                string outputPath = Path.Combine(HostingEnvironment.MapPath(Utility.FormoPath), fn);
                System.IO.File.WriteAllText(outputPath, JsonConvert.SerializeObject(jsonData));
                return RedirectToAction("New", new { name = fn.Replace(".json", "") });
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

            string filePath = Path.Combine(HostingEnvironment.MapPath(Utility.FormoPath), (name + ".json"));
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

                string[] files = Directory.GetFiles(HostingEnvironment.MapPath(Utility.FormoPath));

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

            if(new TableInitializer().InitializeTables(obj.postData))
            {

                return Json(new { success = true, msg = "" });
            }
            else
            {
                return Json(new { success = false, msg = "Failed to create tables in DB:\n"});
            }
        }

        [HttpPost]
        public ActionResult Submit(GenericJson obj)
        {
            Debug.WriteLine("Received Submit request");

            if(new DataCommitter().CommitData(obj.postData))
            {
                return Json(new { success = true, msg = "" });
            }
            else
            {
                return Json(new { success = false, msg = "Failed to commit data to DB"});
            }
        }
    }
}
