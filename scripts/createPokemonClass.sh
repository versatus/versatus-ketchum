#!/bin/bash

# Usage: ./createPokemonClass.sh <path_to_base_class> <json_string> <new_file_name>
# Example: ./createPokemonClass.sh programs/pokemon/BasePokemonProgram.ts $JSON_STRING Bulbasaur

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <path_to_base_class> <json_string> <new_file_name>"
    exit 1
fi

BASE_CLASS_PATH=$1
JSON_STRING=$2
NEW_FILE_NAME=$3

DIRECTORY=$(dirname "$BASE_CLASS_PATH")
NEW_FILE_PATH="$DIRECTORY/$NEW_FILE_NAME.ts"

cp "$BASE_CLASS_PATH" "$NEW_FILE_PATH"

# Use printf to escape the JSON string
ESCAPED_JSON_STRING=$(printf "%q" "$JSON_STRING")

# Use the escaped JSON string to replace the REPLACE_ME placeholder
perl -0777 -i -pe "s|'REPLACE_ME'|$ESCAPED_JSON_STRING|g" "$NEW_FILE_PATH"


if [ $? -eq 0 ]; then
    echo "Successfully created new class file: $NEW_FILE_PATH"
else
    echo "Failed to create new class file."
    exit 1
fi
