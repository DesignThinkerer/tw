(async function () {
    "use strict";

    let assetList = []; 

    // Main execution
    try {
        assetList = await fetchAssetList(); // Fetch the asset list
        console.log("Asset list is ready for use:", assetList);

        // Add event listener for window messages
        window.addEventListener(
            "message",
            async function listener(event) {
                console.log("Received message from:", event.origin);
                console.log("Message content:", event.data);

                switch (event.data.verb) {
                    case "GET":
                        if (event.data.url === "recipes/library/tiddlers.json") {
                            // Respond with the full asset list
                            event.source.postMessage(
                                {
                                    verb: "GET-RESPONSE",
                                    status: "200",
                                    cookies: event.data.cookies,
                                    url: event.data.url,
                                    type: "application/json",
                                    body: JSON.stringify(assetList, null, 4),
                                },
                                "*"
                            );
                        } else if (event.data.url.indexOf("recipes/library/tiddlers/") === 0) {
                            // Handle requests for individual tiddlers
                            let pluginTitle = removePrefix(
                                event.data.url,
                                "recipes/library/tiddlers/"
                            );

                            if (pluginTitle.endsWith(".json")) {
                                pluginTitle = pluginTitle.slice(0, -5); // Remove the .json suffix
                            }

                            const pluginUrl = `${libraryUrl}/tiddlers.json?title=${encodeURIComponent(pluginTitle)}&include_system=1`;

                            try {
                                const pluginResponse = await fetch(pluginUrl);
                                if (!pluginResponse.ok) {
                                    throw new Error(`HTTP error ${pluginResponse.status}`);
                                }
                                const pluginData = await pluginResponse.json();
                                const cleanedResponse = stripOuterBrackets(pluginData);
                                event.source.postMessage(
                                    {
                                        verb: "GET-RESPONSE",
                                        status: "200",
                                        cookies: event.data.cookies,
                                        url: event.data.url,
                                        type: "application/json",
                                        body: cleanedResponse,
                                    },
                                    "*"
                                );
                            } catch (error) {
                                console.error("Failed to fetch plugin data:", error);
                                event.source.postMessage(
                                    {
                                        verb: "GET-RESPONSE",
                                        status: "404",
                                        cookies: event.data.cookies,
                                        url: event.data.url,
                                        type: "text/plain",
                                        body: "Not found",
                                    },
                                    "*"
                                );
                            }
                        } else {
                            // Respond with 404 for unknown routes
                            event.source.postMessage(
                                {
                                    verb: "GET-RESPONSE",
                                    status: "404",
                                    cookies: event.data.cookies,
                                    url: event.data.url,
                                    type: "text/plain",
                                    body: "Not found",
                                },
                                "*"
                            );
                        }
                        break;
                }
            },
            false
        );

    } catch (error) {
        console.error("Error in main execution:", error);
    }

    async function fetchAssetList() {
        const queryParams = new URLSearchParams(window.location.search);
        const libraryUrl = queryParams.get('libraryUrl');

        if (!libraryUrl) {
            console.error("No libraryUrl specified in query parameters.");
            return [];
        }

        try {
            const response = await fetch(`${libraryUrl}/tiddlers.json?title=assetList`);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            const data = await response.json();
            console.log("Fetched asset list:", data);
            return data;
        } catch (error) {
            console.error("Failed to fetch asset list:", error);
            return [];
        }
    }

    // Helper function to remove string prefixes
    function removePrefix(string, prefix) {
        return string.startsWith(prefix) ? string.substring(prefix.length) : string;
    }

    // Helper function to strip outer brackets [] from JSON response
    function stripOuterBrackets(json) {
        try {
            const parsed = typeof json === "string" ? JSON.parse(json) : json;
            if (Array.isArray(parsed) && parsed.length === 1) {
                return JSON.stringify(parsed[0], null, 4); // Return the first (and only) object in the array
            }
            return JSON.stringify(parsed, null, 4); // Return formatted JSON as-is
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return json; // Return original JSON if parsing fails
        }
    }
})();
