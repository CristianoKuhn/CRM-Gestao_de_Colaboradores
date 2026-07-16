// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DO GOOGLE APPS SCRIPT
// Gestão de Colaboradores - CRM
// ═══════════════════════════════════════════════════════════════════

const SHEETS = {
  EMPRESAS: "Empresas",
  SETORES: "Setores",
  CARGOS: "Cargos",
  COLABORADORES: "Colaboradores",
  USUARIOS: "Usuarios",
  REGISTROS: "Registros",
  TAREFAS: "Tarefas",
  ONBOARDING_ITEMS: "OnboardingItems",
  ONBOARDING_CHECKLISTS: "OnboardingChecklists",
  DOCUMENTOS: "Documentos",
  RESULTADOS_180: "Resultados180"  // Nova tabela para Resultados 180°
};


// ═══════════════════════════════════════════════════════════════════
// PASTA FIXA PARA ARQUIVOS - ID da pasta fornecida pelo usuário
// ═══════════════════════════════════════════════════════════════════
const PASTA_FIXA_ID = "14ZLtM-ay7-6CXSdrgu4oveyu9InZlJqz"; // Substitua se necessário




function doGet(e) {
  return processRequest(e);
}


function doPost(e) {
  return processRequest(e);
}


function processRequest(e) {
  var action = "";
  var params = {};
  
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
      action = params.action;
    } catch(err) {
      action = e.parameter.action;
    }
  } else if (e && e.parameter) {
    action = e.parameter.action;
    params = e.parameter;
  }
  
  if (!action) {
    return renderError("Ação não especificada.");
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- CONSULTAS GET ---
    if (action === "getEmpresas") {
      return renderJson(getTableData(SHEETS.EMPRESAS, ["id", "nome"]));
    }
    if (action === "getSetores") {
      return renderJson(getTableData(SHEETS.SETORES, ["id", "nome"]));
    }
    if (action === "getCargos") {
      return renderJson(getTableData(SHEETS.CARGOS, ["id", "nome"]));
    }
    if (action === "getLideres") {
      return renderJson(getTableData(SHEETS.USUARIOS, ["id", "nome", "email", "cargo", "foto_url"]));
    }
    if (action === "getColaboradores" || action === "listarColaboradores") {
      return renderJson(getTableData(SHEETS.COLABORADORES, [
        "id", "nome", "email", "telefone", "cargo_id", "setor_id", "lider_id", 
        "data_admissao", "situacao", "empresa_id", "foto_url", "ativo",
        "cidade_base", "prazo_avaliacao_180", "realizar_experiencia", "avaliacoes_completas"
      ]));
    }
    if (action === "getTimeline" || action === "listarRegistros") {
      var data = getTableData(SHEETS.REGISTROS, ["id", "colaborador_id", "tipo", "titulo", "descricao", "status", "prioridade", "data", "prazo", "lider", "data_conclusao", "gerar_tarefa_futura", "tarefa_id", "anexos"]);
      return renderJson(data);
    }
    if (action === "getTarefas" || action === "listarTarefas") {
      return renderJson(getTableData(SHEETS.TAREFAS, ["id", "colaborador_id", "titulo", "descricao", "vencimento", "concluida", "tipo_origem", "registro_id", "responsavel_id"]));
    }
    if (action === "getUsuarios") {
      return renderJson(getTableData(SHEETS.USUARIOS, ["id", "nome", "email", "senha_hash", "perfil", "setor_id", "setores_permitidos", "ativo", "ultimo_login", "cargo", "foto_url"]));
    }
    if (action === "getOnboardingItems") {
      return renderJson(getTableData(SHEETS.ONBOARDING_ITEMS, ["id", "setor_ids", "titulo", "descricao"]));
    }
    if (action === "getOnboardingChecklists") {
      return renderJson(getTableData(SHEETS.ONBOARDING_CHECKLISTS, ["id", "colaborador_id", "items_concluidos", "data_criacao"]));
    }
    if (action === "getDocumentos") {
      return renderJson(getTableData(SHEETS.DOCUMENTOS, ["id", "colaborador_id", "nome", "categoria", "tipo_arquivo", "url", "tamanho", "uploaded_por", "data_upload", "descricao"]));
    }
    
    // --- GET RESULTADOS 180° ---
    if (action === "getResultados180") {
      return renderJson(getTableData(SHEETS.RESULTADOS_180, [
        "id", "colaborador_id", "data_realizacao", "resultado", 
        "media_geral", "media_ponderada", "respostas_json", 
        "observacoes", "avaliador_id", "tipo"
      ]));
    }
    
    // --- GRAVAÇÕES POST (UPSERT) ---
    var dataObj = params.data || params;
    
    if (action === "saveEmpresa") {
      saveRow(SHEETS.EMPRESAS, dataObj, ["id", "nome"]);
      return renderSuccess("Empresa salva.");
    }
    if (action === "saveSetor") {
      saveRow(SHEETS.SETORES, dataObj, ["id", "nome"]);
      return renderSuccess("Setor salvo.");
    }
    if (action === "saveCargo") {
      saveRow(SHEETS.CARGOS, dataObj, ["id", "nome"]);
      return renderSuccess("Cargo salvo.");
    }
    if (action === "saveLider") {
      saveRow(SHEETS.USUARIOS, dataObj, ["id", "nome", "email", "cargo", "foto_url", "perfil", "setor_id", "setores_permitidos", "ativo"]);
      return renderSuccess("Usuário líder salvo.");
    }
    if (action === "saveUsuario") {
      saveRow(SHEETS.USUARIOS, dataObj, ["id", "nome", "email", "senha_hash", "perfil", "setor_id", "setores_permitidos", "ativo", "ultimo_login", "cargo", "foto_url"]);
      return renderSuccess("Usuário salvo.");
    }
    if (action === "deleteUsuario") {
      var deleted = deleteRow(SHEETS.USUARIOS, dataObj.id);
      if (deleted) {
        return renderSuccess("Usuário removido.");
      } else {
        return renderError("Usuário não encontrado.");
      }
    }
    if (action === "deleteColaborador") {
      var deleted = deleteRow(SHEETS.COLABORADORES, dataObj.id);
      if (deleted) {
        return renderSuccess("Colaborador removido.");
      } else {
        return renderError("Colaborador não encontrado.");
      }
    }
    if (action === "saveColaborador" || action === "salvarColaborador" || action === "novoColaborador") {
      saveRow(SHEETS.COLABORADORES, dataObj, [
        "id", "nome", "email", "telefone", "cargo_id", "setor_id", "lider_id", 
        "data_admissao", "situacao", "empresa_id", "foto_url", "ativo",
        "cidade_base", "prazo_avaliacao_180", "realizar_experiencia", "avaliacoes_completas", "data_nascimento"
      ]);
      return renderSuccess("Colaborador salvo.");
    }
    if (action === "saveTimelineRegistro" || action === "salvarRegistro") {
      saveRow(SHEETS.REGISTROS, dataObj, ["id", "colaborador_id", "tipo", "titulo", "descricao", "status", "prioridade", "data", "prazo", "lider", "data_conclusao", "gerar_tarefa_futura", "tarefa_id", "anexos"]);
      return renderSuccess("Registro de feedback/PDI salvo.");
    }
    if (action === "saveTarefa" || action === "salvarTarefa") {
      saveRow(SHEETS.TAREFAS, dataObj, ["id", "colaborador_id", "titulo", "descricao", "vencimento", "concluida", "tipo_origem", "registro_id", "responsavel_id"]);
      return renderSuccess("Tarefa salva.");
    }
    if (action === "saveOnboardingItem") {
      saveRow(SHEETS.ONBOARDING_ITEMS, dataObj, ["id", "setor_ids", "titulo", "descricao"]);
      return renderSuccess("Item de onboarding salvo.");
    }
    if (action === "deleteOnboardingItem") {
      deleteRow(SHEETS.ONBOARDING_ITEMS, dataObj.id);
      return renderSuccess("Item de onboarding removido.");
    }
    if (action === "saveOnboardingChecklist") {
      saveRow(SHEETS.ONBOARDING_CHECKLISTS, dataObj, ["id", "colaborador_id", "items_concluidos", "data_criacao"]);
      return renderSuccess("Checklist de onboarding salvo.");
    }
    if (action === "saveDocumento") {
      saveRow(SHEETS.DOCUMENTOS, dataObj, ["id", "colaborador_id", "nome", "categoria", "tipo_arquivo", "url", "tamanho", "uploaded_por", "data_upload", "descricao"]);
      return renderSuccess("Documento salvo.");
    }
    if (action === "deleteDocumento") {
      deleteRow(SHEETS.DOCUMENTOS, dataObj.id);
      return renderSuccess("Documento removido.");
    }
    
    // --- RESULTADOS 180° ---
    if (action === "saveResultado180") {
      saveRow(SHEETS.RESULTADOS_180, dataObj, [
        "id", "colaborador_id", "data_realizacao", "resultado", 
        "media_geral", "media_ponderada", "respostas_json", 
        "observacoes", "avaliador_id", "tipo"
      ]);
      return renderSuccess("Resultado da Avaliação 180° salvo.");
    }
    if (action === "deleteResultado180") {
      var deleted180 = deleteRow(SHEETS.RESULTADOS_180, dataObj.id);
      if (deleted180) {
        return renderSuccess("Resultado da Avaliação 180° removido.");
      } else {
        return renderError("Resultado não encontrado.");
      }
    }


    // ALTERNAR STATUS DE TAREFA (CONCLUÍDO/PENDENTE)
    if (action === "toggleTarefa") {
      var taskId = String(params.id || dataObj.id);
      var sheet = ss.getSheetByName(SHEETS.TAREFAS);
      if (sheet) {
        var values = sheet.getDataRange().getValues();
        var headers = values[0];
        var idIdx = headers.indexOf("id");
        var concluidaIdx = headers.indexOf("concluida");
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][idIdx]) === taskId) {
            var currentVal = values[i][concluidaIdx];
            var newVal = !(currentVal === true || currentVal === "true" || currentVal == 1);
            sheet.getRange(i + 1, concluidaIdx + 1).setValue(newVal);
            
            var updatedItem = {};
            var updatedRow = sheet.getRange(i + 1, 1, 1, headers.length).getValues()[0];
            ["id", "colaborador_id", "titulo", "descricao", "vencimento", "concluida", "tipo_origem", "registro_id", "responsavel_id"].forEach(function(col) {
              var colIdx = headers.indexOf(col);
              updatedItem[col] = colIdx >= 0 ? updatedRow[colIdx] : "";
            });
            return renderJson(updatedItem);
          }
        }
      }
      return renderError("Tarefa não encontrada.");
    }


    // ═══════════════════════════════════════════════════════════════
    // SALVAR ARQUIVOS NO GOOGLE DRIVE - PASTA FIXA
    // ═══════════════════════════════════════════════════════════════
    if (action === "salvarArquivoDrive") {
      var folderName = dataObj.folderName || "Anexos";
      var colNome = dataObj.colaboradorNome || "Geral";
      var fileName = dataObj.fileName || "arquivo";
      var fileData = dataObj.fileData;
      var mimeType = dataObj.mimeType || "application/octet-stream";
      
      if (!fileData) {
        return renderError("Dados do arquivo vazios.");
      }
      
      var base64Clean = fileData;
      if (fileData.indexOf("base64,") !== -1) {
        base64Clean = fileData.split("base64,")[1];
      }
      
      var decodedBytes = Utilities.base64Decode(base64Clean);
      var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
      
      try {
        var pastaFixa = DriveApp.getFolderById(PASTA_FIXA_ID);
        var subFolder = getOrCreateSubFolder(pastaFixa, folderName);
        var colFolder = getOrCreateSubFolder(subFolder, colNome);
        var file = colFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        var directUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
        
        return renderJson({ 
          url: directUrl, 
          id: file.getId(),
          folderId: colFolder.getId(),
          path: folderName + "/" + colNome + "/" + fileName
        });
        
      } catch (error) {
        return renderError("Erro ao salvar no Drive: " + error.toString());
      }
    }
    
    if (action === "resetData") {
      var sheetsToClear = [SHEETS.EMPRESAS, SHEETS.SETORES, SHEETS.CARGOS, SHEETS.USUARIOS, SHEETS.COLABORADORES, SHEETS.REGISTROS, SHEETS.TAREFAS];
      sheetsToClear.forEach(function(s) {
        var sh = ss.getSheetByName(s);
        if (sh) sh.clearContents();
      });
      return renderSuccess("Planilhas redefinidas.");
    }
    
    if (action === "ping") {
      return renderJson({ sistema: "Gestão de Colaboradores", versao: "1.1.0", status: "Online", dataHora: new Date().toISOString() });
    }
    
    return renderError("Ação desconhecida: " + action);
  } catch (error) {
    return renderError(error.toString());
  }
}


function getOrCreateSubFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}


function getTableData(sheetName, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(columns);
    return [];
  }
  
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var results = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    columns.forEach(function(col) {
      var colIdx = headers.indexOf(col);
      if (col === "anexos" || col === "avaliacoes_completas" || col === "setor_ids" || col === "respostas_json") {
        try {
          item[col] = colIdx >= 0 && row[colIdx] ? JSON.parse(row[colIdx]) : [];
        } catch (e) {
          item[col] = [];
        }
      } else {
        item[col] = colIdx >= 0 ? row[colIdx] : "";
      }
    });
    results.push(item);
  }
  return results;
}


function saveRow(sheetName, data, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(columns);
  }
  
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  
  columns.forEach(function(col) {
    if (headers.indexOf(col) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(col);
      headers.push(col);
    }
  });
  
  var idIdx = headers.indexOf("id");
  var existingRowIdx = -1;
  var dataId = String(data.id);


  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === dataId) {
      existingRowIdx = i + 1;
      break;
    }
  }
  
  var rowData = headers.map(function(header) {
    if (header === "anexos" || header === "avaliacoes_completas" || header === "setor_ids" || header === "respostas_json") {
      return data[header] !== undefined ? (typeof data[header] === 'string' ? data[header] : JSON.stringify(data[header])) : "[]";
    } else {
      return data[header] !== undefined ? data[header] : "";
    }
  });
  
  if (existingRowIdx >= 0) {
    sheet.getRange(existingRowIdx, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}


function deleteRow(sheetName, id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return false;
  
  var headers = values[0];
  var idIdx = headers.indexOf("id");
  if (idIdx === -1) return false;
  
  var targetId = String(id);


  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === targetId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}


function renderJson(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, status: "success", data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}


function renderSuccess(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, status: "success", message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}


function renderError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, status: "error", message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ═══════════════════════════════════════════════════════════════════
// INSTRUÇÕES DE IMPLEMENTAÇÃO
// ═══════════════════════════════════════════════════════════════════
// 
// 1. CRIE A ABA "Resultados180" NA SUA PLANILHA GOOGLE
//    - Abra sua planilha do Google Sheets
//    - Clique no botão "+" para adicionar uma nova aba
//    - Renomeie a aba para "Resultados180"
//    - Esta aba deve ter as seguintes colunas:
//      - id
//      - colaborador_id
//      - data_realizacao
//      - resultado
//      - media_geral
//      - media_ponderada
//      - respostas_json
//      - observacoes
//      - avaliador_id
//      - tipo
//
// 2. COLE TODO O CÓDIGO ACIMA NO GOOGLE APPS SCRIPT
//    - Abra o Google Apps Script (Extensões > Apps Script)
//    - Delete todo o código existente
//    - Cole todo o código deste arquivo
//    - Salve o projeto (Ctrl+S)
//
// 3. FAÇA O DEPLOY
//    - Clique em "Deploy" > "New deployment"
//    - Selecione o tipo "Web app"
//    - Configure:
//      - Description: "API CRM Gestão de Colaboradores"
//      - Execute as: "Me"
//      - Who has access: "Anyone"
//    - Clique em "Deploy"
//    - Copie a URL do Web App
//
// 4. ATUALIZE A URL NO FRONTEND
//    - Se necessário, atualize a URL do Google Apps Script no frontend
//    - A URL padrão está no arquivo DataService.ts
//    - Substitua pela URL do seu novo deployment
//
// ═══════════════════════════════════════════════════════════════════
