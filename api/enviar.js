import { Resend } from "resend";
import { formidable } from "formidable";
import fs from "node:fs/promises";
import path from "node:path";

export const config = {
  api: { bodyParser: false }
};

const MAX_TOTAL_SIZE = 3 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED = {
  ".pdf": { mime: "application/pdf", signature: (b) => b.subarray(0, 5).toString() === "%PDF-" },
  ".jpg": { mime: "image/jpeg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ".jpeg": { mime: "image/jpeg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ".png": { mime: "image/png", signature: (b) => b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  ".webp": { mime: "image/webp", signature: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" }
};

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

const first = (value) => Array.isArray(value) ? value[0] : value;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Método no permitido." });
  }

  if (!process.env.RESEND_API_KEY || !process.env.DESTINO_EMAIL || !process.env.REMITENTE_EMAIL) {
    return res.status(503).json({ success: false, message: "El formulario todavía no está configurado para enviar correos." });
  }

  try {
    const form = formidable({
      multiples: true,
      maxFiles: MAX_FILES,
      maxFileSize: MAX_TOTAL_SIZE,
      maxTotalFileSize: MAX_TOTAL_SIZE,
      allowEmptyFiles: false,
      filter: () => true
    });

    const [fields, files] = await form.parse(req);
    const nombre = String(first(fields.nombre) || "").trim();
    const correo = String(first(fields.correo) || "").trim();
    const telefono = String(first(fields.telefono) || "").trim();
    const empresa = String(first(fields.empresa) || "").trim();
    const servicio = String(first(fields.servicio) || "").trim();
    const referencia = String(first(fields.referencia) || "").trim();
    const mensaje = String(first(fields.mensaje) || "").trim();
    const autorizacion = first(fields.autorizacion);

    if (!nombre || !correo || !mensaje || autorizacion !== "on") {
      return res.status(400).json({ success: false, message: "Completa los campos obligatorios y acepta el tratamiento de datos." });
    }
    if (nombre.length > 100 || correo.length > 150 || telefono.length > 30 || empresa.length > 120 || mensaje.length > 3000 || referencia.length > 500) {
      return res.status(400).json({ success: false, message: "Uno de los campos supera la longitud permitida." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ success: false, message: "El correo electrónico no es válido." });
    }
    if (referencia && !/^https?:\/\//i.test(referencia)) {
      return res.status(400).json({ success: false, message: "La referencia debe ser un enlace web válido." });
    }

    const rawFiles = files.archivos ? (Array.isArray(files.archivos) ? files.archivos : [files.archivos]) : [];
    if (rawFiles.length > MAX_FILES) {
      return res.status(400).json({ success: false, message: "Puedes adjuntar máximo 5 archivos." });
    }

    const attachments = [];
    let total = 0;
    for (const file of rawFiles) {
      total += file.size;
      if (total > MAX_TOTAL_SIZE) {
        return res.status(400).json({ success: false, message: "Los archivos superan el límite total de 3 MB." });
      }

      const original = path.basename(file.originalFilename || "adjunto");
      const ext = path.extname(original).toLowerCase();
      const rule = ALLOWED[ext];
      if (!rule || file.mimetype !== rule.mime) {
        return res.status(400).json({ success: false, message: "Solo se permiten PDF, JPG, PNG y WEBP." });
      }

      const buffer = await fs.readFile(file.filepath);
      if (!rule.signature(buffer)) {
        return res.status(400).json({ success: false, message: "Uno de los archivos no coincide con su formato declarado." });
      }

      attachments.push({
        filename: original.replace(/[\r\n"]/g, "_"),
        content: buffer.toString("base64")
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.REMITENTE_EMAIL,
      to: [process.env.DESTINO_EMAIL],
      replyTo: correo,
      subject: `Nueva solicitud EfectoManu — ${nombre}`,
      html: `
        <h2>Nueva solicitud desde EfectoManu</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(correo)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(telefono || "No indicado")}</p>
        <p><strong>Empresa / marca:</strong> ${escapeHtml(empresa || "No indicada")}</p>
        <p><strong>Servicio:</strong> ${escapeHtml(servicio || "No especificado")}</p>
        <p><strong>Referencia:</strong> ${referencia ? `<a href="${escapeHtml(referencia)}">${escapeHtml(referencia)}</a>` : "No indicada"}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${escapeHtml(mensaje).replace(/\n/g, "<br>")}</p>
        <p><strong>Archivos adjuntos:</strong> ${attachments.length}</p>
      `,
      attachments
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(502).json({ success: false, message: "No se pudo enviar el correo. Inténtalo nuevamente." });
    }

    return res.status(200).json({ success: true, message: "¡Gracias! Tu mensaje fue enviado correctamente." });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(400).json({ success: false, message: "No se pudo procesar la solicitud. Revisa los archivos e inténtalo nuevamente." });
  }
}
