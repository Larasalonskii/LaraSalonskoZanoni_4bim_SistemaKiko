async function selecionarModo(modo) {
  const mensagem = document.getElementById('mensagem');
  mensagem.textContent = 'Preparando seu acesso...';
  try {
    const resposta = await fetch('/login/selecionarModo', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo })
    });
    const dados = await resposta.json();
    if (!resposta.ok || dados.status !== 'ok') {
      throw new Error(dados.status === 'sem_permissao' ? 'Este acesso é exclusivo para funcionários.' : 'Não foi possível selecionar o acesso.');
    }
    window.location.href = modo === 'funcionario' ? '/menu/cadastros' : '/menu';
  } catch (erro) {
    mensagem.textContent = erro.message;
  }
}
