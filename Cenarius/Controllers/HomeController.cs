using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Mvc;
using System.Web.Mvc.Ajax;
using System.Web.Script.Serialization;
using Newtonsoft.Json.Linq;
using System.Diagnostics;
using Cenarius.Models;
using System.Data.SqlClient;
using System.Data;

namespace Cenarius.Controllers
{
    [Filters.GlobalErrorHandler]
    public class HomeController : Controller
    {
        const string sqlStr = "Server=tcp:cenarius.database.windows.net,1433;Initial Catalog=CenariusAppDB;Persist Security Info=False;User ID=illidan;Password=YouAreNotPrepared555;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;";
        
        public ActionResult Index()
        {
            var mvcName = typeof(Controller).Assembly.GetName();
            var isMono = Type.GetType("Mono.Runtime") != null;

            ViewData["Version"] = mvcName.Version.Major + "." + mvcName.Version.Minor;
            ViewData["Runtime"] = isMono ? "Mono" : ".NET";

            ViewData["Title"] = "新光醫院 [乳房超音波診斷] 資料輸入頁面";
            ViewData["Heading"] = "【附表二】乳房超音波檢查報告單";

            string bcuPathHeader = "~/FormSchema/BreastCancerUltrasound";


            string formaPath = HttpContext.Server.MapPath(bcuPathHeader + "FormaDemo.json");
            string formaStr = System.IO.File.ReadAllText(formaPath);
            JObject forma = JObject.Parse(formaStr);

            ViewData["Forma"] = forma.ToString(Newtonsoft.Json.Formatting.Indented);

            return View();
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
                    obj.InitializeTables(conn);
                }
            }
            catch (Exception e)
            {
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
                    obj.CommitData(conn);
                }
            }
            catch (Exception e)
            {
                return Json(new { success = false, msg = "Failed to commit data to DB:\n" + e.Message });
            }

            return Json(new { success = true, msg = "" });
        }
    }
}
