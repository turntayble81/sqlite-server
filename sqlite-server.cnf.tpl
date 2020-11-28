# Config file must be located at ~/.sqlite-server.cnf and must be valid json.
# Below is a template to create your config file:

{
    "MAX_MEM_PERCENTAGE" : 10,
    "CONNECTION_TIMEOUT" : 900,
    "MAX_CONNECTIONS"    : 10,
    "PORT"               : 9128,
    "DATABASE_FILE"      : "./main.db",
    "LOG_FILE"           : "./server.log"
}
