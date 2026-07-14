const url = 'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';

async function testPost(action) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action })
    });
    const text = await res.text();
    if (!text.includes('Ação inexistente.')) {
      console.log(`[FOUND POST] Action: ${action} -> Response: ${text.substring(0, 150)}`);
    } else {
      // Also check if action is needed in URL query for POST
      const res2 = await fetch(`${url}?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action })
      });
      const text2 = await res2.text();
      if (!text2.includes('Ação inexistente.')) {
        console.log(`[FOUND POST WITH QUERY] Action: ${action} -> Response: ${text2.substring(0, 150)}`);
      }
    }
  } catch (err) {
    console.log(`Action: ${action} -> Error: ${err.message}`);
  }
}

async function run() {
  const actions = [
    'getEmpresas', 'listarEmpresas', 'obterEmpresas', 'buscarEmpresas',
    'getSetores', 'listarSetores', 'obterSetores',
    'getCargos', 'listarCargos', 'obterCargos',
    'getLideres', 'listarLideres', 'obterLideres',
    'getColaboradores', 'listarColaboradores', 'obterColaboradores',
    'getTimeline', 'listarRegistros', 'getRegistros', 'obterRegistros',
    'getTarefas', 'listarTarefas', 'getTarefas', 'obterTarefas',
    'getUsuarios', 'listarUsuarios', 'obterUsuarios'
  ];
  for (const act of actions) {
    await testPost(act);
  }
  console.log("Done testing POST actions.");
}

run();
