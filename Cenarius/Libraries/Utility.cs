using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;

namespace Cenarius.Libraries
{
    public class Utility
    {
        public const string EnumOptionsSuffix = ".enum_options";

        public static Dictionary<string, SqlDbType> SqlHintToSqlType = new Dictionary<string, SqlDbType>()
        {
            {"float", SqlDbType.Float},
            {"integer", SqlDbType.Int},
            {"nvarchar", SqlDbType.NVarChar},
            {"bit", SqlDbType.Bit},
            {"date", SqlDbType.Date}
        };
    }
}