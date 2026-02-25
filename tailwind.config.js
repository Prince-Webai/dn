/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'delaval-blue': '#0051A5',
                'delaval-dark-blue': '#003875',
                'delaval-light-blue': '#E6F0FF',
                'delaval-accent': '#FF6B00',
                'success-green': '#00A862',
                'warning-yellow': '#FFC107',
                'error-red': '#DC3545',
            },
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'],
                display: ['"Inter"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
