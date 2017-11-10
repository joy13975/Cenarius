using Microsoft.SqlServer.Server;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;
using static Cenarius.Libraries.Utility;

namespace Cenarius.Models
{
    public class GenericJson
    {
        public string postData { get; set; }
    }
}