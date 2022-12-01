import basicSsl from '@vitejs/plugin-basic-ssl'

export default {
    base: '/i-need-a-drink/',
    server: {
        host: "0.0.0.0",
        https: true
    },
    plugins: [
        basicSsl()
    ]
}
