import { QRCodeToDataURLOptions } from "qrcode";

export const codeOptions: QRCodeToDataURLOptions = {
    margin: 3,
    scale: 4,
    color: { light: '#ffffff', dark: "#333" },
    errorCorrectionLevel: 'H',
};