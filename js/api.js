// js/api.js

const BACKEND_URL = "http://127.0.0.1:8000";

async function fetchAPI(endpoint, method = 'GET', body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Error en la petición al servidor");
        }

        return data;
    } catch (error) {
        console.error("Error en fetchAPI:", error);
        throw error;
    }
}