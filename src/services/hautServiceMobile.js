// hautServiceMobile.js
// Service module for handling Haut.ai API interactions from mobile client

/* ------------------------------------------------------
WHAT IT DOES
- Manages all Haut.ai API interactions for the mobile app
- Creates subjects (users) in Haut.ai system
- Processes and uploads images for analysis
- Handles API responses and errors

DATA USED
- HAUT_API_TOKEN: Authentication token for Haut.ai API
- Subject data (name, metadata)
- Image data for processing

DEV PRINCIPLES
- Always use vanilla JS
- Keep API endpoint construction dynamic using env variables
- Handle errors gracefully with meaningful messages
- Maintain consistent error response format

NEXT STEPS
[ ] Add subject update functionality
[ ] Implement batch processing for multiple images
[ ] Add caching for frequent requests
------------------------------------------------------*/

// v01
// updated 2025-02-26

import {
    EXPO_PUBLIC_HAUT_API_TOKEN,
    EXPO_PUBLIC_HAUT_COMPANY_ID,
    EXPO_PUBLIC_HAUT_DATASET_ID,
} from '@env';


// endpoint for subjects:
const HAUT_SUBJECTS_ENDPOINT = "https://saas.haut.ai/api/v1/companies/406aa271-dd6b-44f7-a570-cf7b1e16d0e6/datasets/3947fea7-a6d9-4234-a94f-bc315ba912ea/subjects/"
const TKN = EXPO_PUBLIC_HAUT_API_TOKEN
const COMPANY_ID = EXPO_PUBLIC_HAUT_COMPANY_ID
const DATASET_ID = EXPO_PUBLIC_HAUT_DATASET_ID




/*
// CREATE SUBJECT
// haut response:
{
  "name": "Amber Tester",
  "birth_date": null,
  "biological_sex": null,
  "meta": null,
  "id": "6fcea099-1557-42c9-87cc-7501ff5ebfb9",
  "author_id": 1103,
  "creation_time": "2025-02-27 03:40:28",
  "company": {
    "id": "406aa271-dd6b-44f7-a570-cf7b1e16d0e6",
    "name": "LDVDO Holdings, Inc."
  },
  "dataset": {
    "id": "3947fea7-a6d9-4234-a94f-bc315ba912ea",
    "name": "Test Mirror Dataset"
  },
  "promote_image_id": null
}
*/






/**
 * Creates a new subject (user) in Haut.ai system
 * @param {string} name - Name of the subject
 * @returns {Promise<{subjectId: string}>} The created subject's ID
 */
async function createSubject(name) {
    if (!name) {
        throw new Error("Name is required");
    }

    try {
        const response = await fetch(HAUT_SUBJECTS_ENDPOINT, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TKN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "name": name,
                "birth_date": null,
                "biological_sex": null,
                "meta": null
            })
        });

        const data = await response.json();
        console.log("Haut API Response:", JSON.stringify(data));

        if (!response.ok) {
            throw new Error(`API Error: ${JSON.stringify(data)}`);
        }

        const subjectId = data.id ?? "no-subject-id";
        return { subjectId };

    } catch (error) {
        console.error("Error creating subject:", error);
        throw new Error(`Failed to create subject: ${error.message}`);
    }
}


export {
    createSubject
};