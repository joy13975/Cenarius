using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Mvc;
using System.Web.Mvc.Ajax;
using System.Web.Script.Serialization;
using Newtonsoft.Json.Linq;

namespace Cenarius.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            var mvcName = typeof(Controller).Assembly.GetName();
            var isMono = Type.GetType("Mono.Runtime") != null;

            ViewData["Version"] = mvcName.Version.Major + "." + mvcName.Version.Minor;
            ViewData["Runtime"] = isMono ? "Mono" : ".NET";

            ViewData["Title"] = "新光醫院 [乳房超音波診斷] 資料輸入頁面";
            ViewData["Heading"] = "【附表二】乳房超音波檢查報告單";

            string bcuPathHeader = "~/FormSchema/BreastCancerUltrasound";

            string schemaPath = HttpContext.Server.MapPath(bcuPathHeader + "Schema.json");
            string formPath = HttpContext.Server.MapPath(bcuPathHeader + "Form.json");
            string paramsPath = HttpContext.Server.MapPath(bcuPathHeader + "Params.json");

            string schemaStr = System.IO.File.ReadAllText(schemaPath);
            string formStr = System.IO.File.ReadAllText(formPath);
            string paramsStr = System.IO.File.ReadAllText(paramsPath);

            ViewData["Schema"] = schemaStr;
            ViewData["Form"] = formStr;
            ViewData["Params"] = paramsStr;


            string formaPath = HttpContext.Server.MapPath(bcuPathHeader + "Forma.json");
            string formaStr = System.IO.File.ReadAllText(formaPath);
            JObject forma = JObject.Parse(formaStr);
            
            ViewData["Forma"] = forma.ToString(Newtonsoft.Json.Formatting.Indented);

            return View();
        }
    }
}
