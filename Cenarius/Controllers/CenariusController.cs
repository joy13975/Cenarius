using Cenarius.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Cenarius.Controllers
{
    public class CenariusController : Controller
    {
        BreastCancerReportEntities bcrDB;

        public CenariusController()
        {
            bcrDB = new BreastCancerReportEntities();
        }

        // GET: Cenarius
        public ActionResult Index()
        {
            ViewData.Model = bcrDB.BreastCancerReports.ToList();
            return View();
        }

        // GET: Cenarius/Details/5
        public ActionResult Details(int id)
        {
            return View();
        }

        // GET: Cenarius/Create
        public ActionResult Create()
        {
            return View();
        }

        // POST: Cenarius/Create
        [HttpPost]
        public ActionResult Create(FormCollection collection)
        {
            try
            {
                // TODO: Add insert logic here

                return RedirectToAction("Index");
            }
            catch
            {
                return View();
            }
        }

        // GET: Cenarius/Edit/5
        public ActionResult Edit(int id)
        {
            return View();
        }

        // POST: Cenarius/Edit/5
        [HttpPost]
        public ActionResult Edit(int id, FormCollection collection)
        {
            try
            {
                // TODO: Add update logic here

                return RedirectToAction("Index");
            }
            catch
            {
                return View();
            }
        }

        // GET: Cenarius/Delete/5
        public ActionResult Delete(int id)
        {
            return View();
        }

        // POST: Cenarius/Delete/5
        [HttpPost]
        public ActionResult Delete(int id, FormCollection collection)
        {
            try
            {
                // TODO: Add delete logic here

                return RedirectToAction("Index");
            }
            catch
            {
                return View();
            }
        }
    }
}
