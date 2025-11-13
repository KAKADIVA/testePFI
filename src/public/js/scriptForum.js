let usuarioLogado = null;
let perguntas = [];
let perguntaIdAtual = null;
let arquivoSelecionado = null;

// === SISTEMA DE EXCLUSÃO ===
async function excluirPergunta(perguntaId) {
  const confirmado = await confirmarAcao('Tem certeza que deseja excluir esta pergunta?<br><br><strong>Esta ação não pode ser desfeita.</strong>', 'exclusao');
  if (!confirmado) return;

  try {
  const res = await fetch(`/usuarios/pergunta/${perguntaId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await res.json();
    if (res.ok) {
      mostrarToast('Pergunta excluída com sucesso!', 'success');
      await carregarPerguntas();
    } else {
      mostrarToast(data.mensagem || 'Erro ao excluir pergunta', 'error');
    }
  } catch (error) {
    console.error('Erro ao excluir pergunta:', error);
    mostrarToast('Erro ao conectar com o servidor', 'error');
  }
}

async function excluirResposta(respostaId) {
  const confirmado = await confirmarAcao('Tem certeza que deseja excluir esta resposta?<br><br><strong>Esta ação não pode ser desfeita.</strong>', 'exclusao');
  if (!confirmado) return;

  try {
  const res = await fetch(`/usuarios/resposta/${respostaId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await res.json();
    if (res.ok) {
      mostrarToast('Resposta excluída com sucesso!', 'success');
      await carregarPerguntas();
    } else {
      mostrarToast(data.mensagem || 'Erro ao excluir resposta', 'error');
    }
  } catch (error) {
    console.error('Erro ao excluir resposta:', error);
    mostrarToast('Erro ao conectar com o servidor', 'error');
  }
}

// === SISTEMA DE FAVORITOS ===
function inicializarFavoritos() {
  let favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
  return favoritos;
}

function toggleFavorito(perguntaId) {
  let favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
  const index = favoritos.indexOf(perguntaId);
  
  if (index > -1) {
    favoritos.splice(index, 1);
    mostrarToast('Pergunta removida dos favoritos', 'success');
  } else {
    favoritos.push(perguntaId);
    mostrarToast('Pergunta adicionada aos favoritos', 'success');
  }
  
  localStorage.setItem('favoritos', JSON.stringify(favoritos));
  renderPerguntas();
  return index === -1;
}

function isFavoritado(perguntaId) {
  const favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
  return favoritos.includes(perguntaId);
}

function criarBotaoFavorito(perguntaId) {
  const favoritado = isFavoritado(perguntaId);
  return `
    <button class="btn-favorito ${favoritado ? 'favoritado' : 'nao-favoritado'}" 
            onclick="toggleFavorito(${perguntaId})"
            aria-label="${favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
      ${favoritado ? '★' : '☆'}
    </button>
  `;
}

// === SISTEMA DE ANEXOS ===
function inicializarUpload() {
  const inputAnexo = document.getElementById('anexoPergunta');
  const preview = document.getElementById('previewAnexo');
  
  inputAnexo.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        mostrarToast('Arquivo muito grande. Máximo 5MB.', 'error');
        return;
      }
      
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
                              'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!tiposPermitidos.includes(file.type)) {
        mostrarToast('Tipo de arquivo não permitido. Use JPEG, PNG, GIF, PDF ou DOC.', 'error');
        return;
      }
      
      arquivoSelecionado = file;
      mostrarPreviewArquivo(file);
    }
  });
}

function mostrarPreviewArquivo(file) {
  const preview = document.getElementById('previewAnexo');
  const tamanho = formatarTamanhoArquivo(file.size);
  
  preview.innerHTML = `
    <div class="arquivo-preview">
      <div class="arquivo-info">
        <div class="arquivo-nome">${file.name}</div>
        <div class="arquivo-tamanho">${tamanho}</div>
      </div>
      <button type="button" class="remover-arquivo" onclick="removerAnexo()">✕</button>
    </div>
  `;
  preview.style.display = 'block';
}

function removerAnexo() {
  const inputAnexo = document.getElementById('anexoPergunta');
  const preview = document.getElementById('previewAnexo');
  
  inputAnexo.value = '';
  preview.style.display = 'none';
  arquivoSelecionado = null;
}

function formatarTamanhoArquivo(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// === LOADING STATES ===
function setLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

// === TOAST NOTIFICATIONS ===
function mostrarToast(mensagem, tipo = 'success', duracao = 5000) {
  const toastsExistentes = document.querySelectorAll('.toast');
  toastsExistentes.forEach(toast => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });
  
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensagem;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duracao);
}

// === CONFIRMAÇÃO DE AÇÕES ===
function confirmarAcao(mensagem, tipo = 'exclusao') {
  return new Promise((resolve) => {
    const modal = criarModalConfirmacao(mensagem, resolve, tipo);
    document.body.appendChild(modal);
  });
}

function criarModalConfirmacao(mensagem, callback, tipo = 'exclusao') {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  
  const corPrincipal = tipo === 'exclusao' ? '#EF4444' : '#8B5CF6';
  const icone = tipo === 'exclusao' ? '⚠️' : '❓';
  const titulo = tipo === 'exclusao' ? 'Confirmar Exclusão' : 'Confirmação';
  
  modal.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      max-width: 400px;
      width: 90%;
      border: 3px solid ${corPrincipal};
      text-align: center;
    ">
      <div style="font-size: 48px; margin-bottom: 15px;">${icone}</div>
      <h3 style="
        color: ${corPrincipal};
        margin: 0 0 15px 0;
        font-size: 22px;
        font-weight: 700;
      ">${titulo}</h3>
      
      <p style="
        color: #1F2937;
        margin-bottom: 30px;
        font-size: 16px;
        line-height: 1.5;
      ">${mensagem}</p>
      
      <div style="
        display: flex;
        gap: 15px;
        justify-content: center;
      ">
        <button id="confirmar-cancelar" style="
          background: #6B7280;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          flex: 1;
        ">
          Cancelar
        </button>
        <button id="confirmar-ok" style="
          background: linear-gradient(135deg, ${corPrincipal}, ${tipo === 'exclusao' ? '#DC2626' : '#7C3AED'});
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
          flex: 1;
        ">
          ${tipo === 'exclusao' ? 'Excluir' : 'Confirmar'}
        </button>
      </div>
    </div>
  `;
  
  modal.querySelector('#confirmar-ok').addEventListener('click', () => {
    document.body.removeChild(modal);
    callback(true);
  });
  
  modal.querySelector('#confirmar-cancelar').addEventListener('click', () => {
    document.body.removeChild(modal);
    callback(false);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      callback(false);
    }
  });
  
  return modal;
}

// === LOGOUT CORRIGIDO (MENSAGEM AMIGÁVEL) ===
async function logout() {
  const confirmado = await confirmarLogout();
  if (!confirmado) return;
  
  try {
    setLoading(document.querySelector('.logout-btn'), true);
  await fetch('/usuarios/logout', {
      method: 'POST',
      credentials: 'include'
    });
    localStorage.removeItem('usuarioLogado');
    mostrarToast('Logout realizado com sucesso!', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    mostrarToast('Erro ao fazer logout', 'error');
  } finally {
    setLoading(document.querySelector('.logout-btn'), false);
  }
}

// === MODAL ESPECÍFICO PARA LOGOUT ===
function confirmarLogout() {
  return new Promise((resolve) => {
    const modal = criarModalLogout(resolve);
    document.body.appendChild(modal);
  });
}

function criarModalLogout(callback) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  
  modal.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      max-width: 400px;
      width: 90%;
      border: 3px solid #0EA5E9;
      text-align: center;
    ">
      <div style="font-size: 48px; margin-bottom: 15px;">👋</div>
      <h3 style="
        color: #0EA5E9;
        margin: 0 0 15px 0;
        font-size: 22px;
        font-weight: 700;
      ">Sair da Conta</h3>
      
      <p style="
        color: #1F2937;
        margin-bottom: 30px;
        font-size: 16px;
        line-height: 1.5;
      ">Tem certeza que deseja sair?<br><br>Você será redirecionado para a página de login.</p>
      
      <div style="
        display: flex;
        gap: 15px;
        justify-content: center;
      ">
        <button id="logout-cancelar" style="
          background: #6B7280;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          flex: 1;
        ">
          Cancelar
        </button>
        <button id="logout-confirmar" style="
          background: linear-gradient(135deg, #0EA5E9, #0284C7);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
          flex: 1;
        ">
          Sair
        </button>
      </div>
    </div>
  `;
  
  modal.querySelector('#logout-confirmar').addEventListener('click', () => {
    document.body.removeChild(modal);
    callback(true);
  });
  
  modal.querySelector('#logout-cancelar').addEventListener('click', () => {
    document.body.removeChild(modal);
    callback(false);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      callback(false);
    }
  });
  
  return modal;
}

// MODAL PARA RESPONDER
function criarModalResposta() {
    const modalExistente = document.getElementById('modal-resposta');
    if (modalExistente) {
        modalExistente.remove();
    }

    const modalHTML = `
        <div id="modal-resposta" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                max-width: 500px;
                width: 90%;
                border: 3px solid #8B5CF6;
            ">
                <h3 style="
                    color: #0EA5E9;
                    margin: 0 0 20px 0;
                    font-size: 22px;
                    font-weight: 700;
                    text-align: center;
                ">Responder como Profissional</h3>
                
                <textarea 
                    id="resposta-text" 
                    placeholder="Digite sua resposta aqui..."
                    style="
                        width: 100%;
                        height: 150px;
                        border: 2px solid #D1D5DB;
                        border-radius: 12px;
                        padding: 15px;
                        font-family: inherit;
                        font-size: 15px;
                        resize: none;
                        margin-bottom: 20px;
                    "
                ></textarea>
                
                <div style="
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                ">
                    <button 
                        onclick="fecharModalResposta()"
                        style="
                            background: #6B7280;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 12px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                        "
                    >
                        Cancelar
                    </button>
                    <button 
                        onclick="enviarResposta()"
                        style="
                            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 12px;
                            cursor: pointer;
                            font-weight: 700;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                        "
                    >
                        Enviar Resposta
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Verificar se usuário está logado
async function verificarSessao() {
  try {
  const res = await fetch('/usuarios/sessao', {
      credentials: 'include'
    });
    
    if (res.ok) {
      usuarioLogado = await res.json();
      document.getElementById('boasVindas').innerText = `Olá, ${usuarioLogado.nome}`;
      await carregarPerguntas();
    } else {
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    window.location.href = 'index.html';
  }
}

// Carregar perguntas do backend
async function carregarPerguntas() {
  try {
    console.log('Carregando perguntas...');
  const res = await fetch('/usuarios/pergunta');
    if (res.ok) {
      perguntas = await res.json();
      console.log('Perguntas carregadas:', perguntas);
      await renderPerguntas();
    } else {
      console.log('Erro ao carregar perguntas');
    }
  } catch (error) {
    console.error('Erro ao carregar perguntas:', error);
  }
}

// Enviar pergunta (COM ANEXOS E LOADING)
async function enviarPergunta() {
  const titulo = "Pergunta";
  const descricao = document.getElementById('perguntaInput').value.trim();
  
  if (!descricao) {
    mostrarToast('Digite uma pergunta!', 'warning');
    return;
  }

  try {
    const submitBtn = document.querySelector('.question-area button');
    setLoading(submitBtn, true);
    
    if (arquivoSelecionado) {
      const formData = new FormData();
      formData.append('titulo', titulo);
      formData.append('descricao', descricao);
      formData.append('anexo', arquivoSelecionado);
      
      console.log('📤 Enviando pergunta com anexo...');
      
  const res = await fetch('/usuarios/pergunta', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await res.json();
      
      if (res.ok) {
        document.getElementById('perguntaInput').value = '';
        removerAnexo();
        mostrarToast('Pergunta enviada com sucesso!', 'success');
        await carregarPerguntas();
      } else {
        mostrarToast(data.mensagem || 'Erro ao enviar pergunta', 'error');
      }
    } else {
      const body = JSON.stringify({ titulo, descricao });
      
      console.log('📤 Enviando pergunta sem anexo...');
      
  const res = await fetch('/usuarios/pergunta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: body
      });

      const data = await res.json();
      
      if (res.ok) {
        document.getElementById('perguntaInput').value = '';
        mostrarToast('Pergunta enviada com sucesso!', 'success');
        await carregarPerguntas();
      } else {
        mostrarToast(data.mensagem || 'Erro ao enviar pergunta', 'error');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao enviar pergunta:', error);
    mostrarToast('Erro ao conectar com o servidor: ' + error.message, 'error');
  } finally {
    const submitBtn = document.querySelector('.question-area button');
    setLoading(submitBtn, false);
  }
}

// ABRIR MODAL PARA RESPONDER
async function responder(perguntaId) {
    perguntaIdAtual = perguntaId;
    criarModalResposta();
    
    const modal = document.getElementById('modal-resposta');
    const textarea = document.getElementById('resposta-text');
    
    modal.style.display = 'flex';
    textarea.focus();
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            fecharModalResposta();
        }
    });
    
    document.addEventListener('keydown', function fecharComESC(e) {
        if (e.key === 'Escape') {
            fecharModalResposta();
            document.removeEventListener('keydown', fecharComESC);
        }
    });
}

// FECHAR MODAL
function fecharModalResposta() {
    const modal = document.getElementById('modal-resposta');
    if (modal) {
        modal.style.display = 'none';
    }
    perguntaIdAtual = null;
}

// ENVIAR RESPOSTA (COM LOADING)
async function enviarResposta() {
    const descricao = document.getElementById('resposta-text').value.trim();
    
    if (!descricao) {
        mostrarToast("Por favor, digite uma resposta!", 'warning');
        return;
    }

    if (!perguntaIdAtual) {
        mostrarToast("Erro: pergunta não encontrada!", 'error');
        return;
    }

    try {
        const submitBtn = document.querySelector('#modal-resposta button[onclick="enviarResposta()"]');
        setLoading(submitBtn, true);

  const res = await fetch('/usuarios/resposta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                descricao, 
                pergunta_id: perguntaIdAtual 
            })
        });

        const data = await res.json();
        if (res.ok) {
            fecharModalResposta();
            mostrarToast('Resposta enviada com sucesso!', 'success');
            await carregarPerguntas();
        } else {
            mostrarToast(data.mensagem || 'Erro ao enviar resposta', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro ao conectar com o servidor', 'error');
    } finally {
        const submitBtn = document.querySelector('#modal-resposta button[onclick="enviarResposta()"]');
        setLoading(submitBtn, false);
    }
}

// Carregar respostas de uma pergunta
async function carregarRespostas(perguntaId) {
  try {
  const res = await fetch(`/usuarios/resposta/${perguntaId}`);
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar respostas:', error);
    return [];
  }
}

// Renderizar perguntas (COM FAVORITOS, EXCLUSÃO E ANEXOS CORRIGIDOS)
async function renderPerguntas() {
  const lista = document.getElementById('listaPerguntas');
  lista.innerHTML = '';

  for (const pergunta of perguntas) {
    const respostas = await carregarRespostas(pergunta.id);
    
    const div = document.createElement('div');
    div.classList.add('pergunta');
    
    const badgeProfissional = pergunta.profissional ? '<span class="profissional-badge">Profissional</span>' : '';
    const botaoFavorito = criarBotaoFavorito(pergunta.id);
    
    // Botão de excluir pergunta (apenas se for o autor)
    const botaoExcluirPergunta = usuarioLogado && usuarioLogado.id === pergunta.usuario_id ? 
      `<button class="btn-excluir" onclick="excluirPergunta(${pergunta.id})" title="Excluir pergunta">🗑️</button>` : '';
    
    // === ANEXOS CORRIGIDOS ===
    let anexoHTML = '';
    if (pergunta.nome_arquivo) {
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(pergunta.nome_arquivo);
      if (isImage) {
        anexoHTML = `
          <div class="anexo-pergunta">
            <a href="/uploads/${pergunta.nome_arquivo}" target="_blank" class="anexo-link">
              📎 ${pergunta.nome_arquivo}
            </a>
            <img src="/uploads/${pergunta.nome_arquivo}" alt="Anexo" class="anexo-imagem">
          </div>
        `;
      } else {
        anexoHTML = `
          <div class="anexo-pergunta">
            <a href="/uploads/${pergunta.nome_arquivo}" target="_blank" class="anexo-link">
              📎 ${pergunta.nome_arquivo}
            </a>
          </div>
        `;
      }
    }
    
    div.innerHTML = `
      <div class="pergunta-header">
        <div class="autor-favorito">
          <div class="autor">${pergunta.autor || 'Usuário'}${badgeProfissional}</div>
        </div>
        <div class="acoes-pergunta">
          ${botaoFavorito}
          ${botaoExcluirPergunta}
        </div>
      </div>
      <p><strong>${pergunta.titulo}</strong></p>
      <p>${pergunta.descricao}</p>
      ${anexoHTML}
      ${respostas.map(r => {
        const badgeResposta = r.profissional ? '<span class="profissional-badge">Profissional</span>' : '';
        // Botão de excluir resposta (apenas se for o autor)
        const botaoExcluirResposta = usuarioLogado && usuarioLogado.id === r.usuario_id ? 
          `<button class="btn-excluir btn-excluir-resposta" onclick="excluirResposta(${r.id})" title="Excluir resposta">🗑️</button>` : '';
        
        return `
          <div class="resposta">
            <div class="resposta-header">
              <div class="resposta-autor">${r.autor || 'Usuário'}${badgeResposta}</div>
              ${botaoExcluirResposta}
            </div>
            <p>${r.descricao}</p>
          </div>
        `;
      }).join('')}
      ${usuarioLogado && usuarioLogado.profissional ? `
        <button onclick="responder(${pergunta.id})">Responder como Profissional</button>
      ` : usuarioLogado ? '<p style="color: #666; font-style: italic;">Apenas profissionais podem responder</p>' : ''}
    `;
    lista.appendChild(div);
  }
}

// INICIALIZAÇÃO
function inicializarForum() {
  inicializarUpload();
  inicializarFavoritos();
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
  verificarSessao();
  inicializarForum();
});