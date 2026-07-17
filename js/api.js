// js/api.js

const BACKEND_URL = "http://127.0.0.1:8000";

async function fetchAPI(endpoint, method = 'GET', body = null) {
    const headers = {};

    // Obtener el token de localStorage automáticamente
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (body && method !== 'GET') {
        if (body instanceof FormData) {
            // Si es FormData, el navegador asigna automáticamente el Content-Type (incluyendo el boundary)
            config.body = body;
        } else if (body instanceof URLSearchParams) {
            // Si es URLSearchParams, el navegador asigna el Content-Type application/x-www-form-urlencoded
            config.body = body;
        } else {
            // Si es un objeto, lo mandamos como JSON
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(body);
        }
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