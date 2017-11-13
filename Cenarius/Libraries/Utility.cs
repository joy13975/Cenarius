using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;

namespace Cenarius.Libraries
{
    public class Utility
    {
        public static string sqlStr { get; private set; } =
            "Data Source=(LocalDB)\\MSSQLLocalDB;AttachDbFilename=\"C:\\Users\\Akaoni\\Documents\\Visual Studio 2017\\Projects\\Cenarius\\Cenarius\\App_Data\\LocalCenarius.mdf\";Integrated Security=True";

        public class SqlCred
        {
            public string username { get; set; }
            public string password { get; set; }
        }

        public static void SetSqlUserPwd(SqlCred sqlCreds)
        {
            sqlStr = sqlStr.Replace("{your_username}", sqlCreds.username)
                .Replace("{your_password}", sqlCreds.password);
        }

        public const string FormoPath = "~/Formo/";

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