using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Web;

namespace Cenarius.Models
{
    public class GenericJson
    {
        public string PostData { get; set; }

        public bool CommitData(dynamic data)
        {

            return false;
        }
    }
}