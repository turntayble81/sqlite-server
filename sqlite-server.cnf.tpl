#############################################################
# Config file must be located at ~/.sqlite-server.cnf
# It is recommended that this file is copied to that location
# and used as your starting point
#############################################################


# Maximum percentage of system memory which
# may be used by the server process:
MAX_MEM_PERCENTAGE = 10

# Number of seconds after which time idle connections
# will be disconnected:
CONNECTION_TIMEOUT = 900

# Maximum number of concurrent connections to the server:
MAX_CONNECTIONS = 10

# Port server listens for connections on:
PORT = 9128

# Location of database file:
DATABASE_FILE = ./main.db

# Path to file where server logs should be written to:
LOG_FILE = ./server.log
