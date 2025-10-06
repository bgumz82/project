
import { query } from '@/lib/db';

/**
 * Verifica se os arquivos procMDFe.xml e damdfe.pdf existem fisicamente
 * e atualiza o status do MDF-e para "emitido" quando encontrados
 */
export async function checkMDFeFilesAndUpdateStatus(documentoId: string): Promise<boolean> {
  try {
    console.log("🔍 Verificando arquivos do MDF-e:", documentoId);

    // Buscar paths dos arquivos do documento
    const documento = await query(`
      SELECT id, xml_proc_path, pdf_path, status
      FROM mdfe_documentos
      WHERE id = $1 AND status = 'aguardando'
    `, [documentoId]);

    if (!documento || documento.length === 0) {
      console.log("⚠️ Documento não encontrado ou não está aguardando:", documentoId);
      return false;
    }

    const doc = documento[0];
    const xmlProcPath = doc.xml_proc_path;
    const pdfPath = doc.pdf_path;

    if (!xmlProcPath || !pdfPath) {
      console.log("⚠️ Paths de arquivo não definidos para MDF-e:", documentoId);
      return false;
    }

    // Verificar se os arquivos existem
    const xmlProcExists = await checkFileExists(xmlProcPath);
    const pdfExists = await checkFileExists(pdfPath);

    console.log("📄 Status dos arquivos:", {
      xmlProc: xmlProcExists ? '✓' : '✗',
      pdf: pdfExists ? '✓' : '✗'
    });

    // Se ambos os arquivos existem, atualizar status para "emitido"
    if (xmlProcExists && pdfExists) {
      await query(`
        UPDATE mdfe_documentos
        SET status = 'emitido', 
            pdf_gerado = true,
            pdf_gerado_em = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `, [documentoId]);

      console.log("✅ Status do MDF-e atualizado para 'emitido':", documentoId);
      return true;
    }

    console.log("⏳ Arquivos ainda não disponíveis, mantendo status 'aguardando'");
    return false;

  } catch (error) {
    console.error("❌ Erro ao verificar arquivos do MDF-e:", error);
    return false;
  }
}

/**
 * Verifica se um arquivo existe no sistema de arquivos
 */
async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    // Remover barra inicial se existir para paths relativos
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    const response = await fetch(`/${normalizedPath}`, { 
      method: 'HEAD',
      cache: 'no-store'
    });
    
    return response.ok;
  } catch (error) {
    console.error("Erro ao verificar arquivo:", filePath, error);
    return false;
  }
}

/**
 * Verifica todos os MDF-es com status "aguardando" e atualiza se os arquivos existirem
 */
export async function checkAllPendingMDFes(): Promise<void> {
  try {
    console.log("🔄 Verificando todos os MDF-es aguardando...");

    const documentos = await query(`
      SELECT id FROM mdfe_documentos WHERE status = 'aguardando'
    `);

    if (!documentos || documentos.length === 0) {
      console.log("✅ Nenhum MDF-e aguardando verificação");
      return;
    }

    console.log(`📋 Encontrados ${documentos.length} MDF-e(s) aguardando`);

    for (const doc of documentos) {
      await checkMDFeFilesAndUpdateStatus(doc.id);
    }

    console.log("✅ Verificação concluída");
  } catch (error) {
    console.error("❌ Erro ao verificar MDF-es aguardando:", error);
  }
}
