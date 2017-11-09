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
        public HomeController()
        {
        }

        ~HomeController()
        {
        }

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
        public ActionResult Submit(GenericJson obj)
        {
            Debug.WriteLine("Received submit request");

            try
            {
                var modelData = Newtonsoft.Json.JsonConvert.DeserializeObject<dynamic>(obj.PostData);

            }
            catch (Exception e)
            {
                return Json(new { success = false, msg = "Failed to commit data to DB:\n" + e.Message });
            }

            return Json(new { success = true, msg = "" });
        }
    }
}
