﻿using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Cenarius.Filters
{
    public class GlobalErrorHandlerAttribute : FilterAttribute, IExceptionFilter
    {
        public void OnException(ExceptionContext filterContext)
        {
            Debug.WriteLine("GlobalErrorHandlerOnException()");

            filterContext.ExceptionHandled = true;
            filterContext.Result = new JsonResult
            {
                Data = new { success = false, msg = filterContext.Exception.ToString() },
                JsonRequestBehavior = JsonRequestBehavior.AllowGet
            };

            Debug.WriteLine(filterContext.Exception.Message);
            Debug.WriteLine(filterContext.Exception.StackTrace);
        }
    }
}