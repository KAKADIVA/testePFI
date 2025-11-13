document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando script...');

  // === PROTEÇÃO CONTRA BRUTEFORCE ===
  let tentativasLogin = 0;
  let tempoBloqueio = 0;

  function inicializarProtecao() {
    const tentativasSalvas = localStorage.getItem('tentativasLogin');
    const ultimaTentativa = localStorage.getItem('ultimaTentativa');
    
    if (tentativasSalvas) {
      tentativasLogin = parseInt(tentativasSalvas);
      
      // Resetar tentativas após 1 hora
      if (ultimaTentativa && (Date.now() - parseInt(ultimaTentativa)) > (60 * 60 * 1000)) {
        resetarTentativas();
      }
    }
  }

  function verificarBloqueio() {
    const agora = Date.now();
    if (tempoBloqueio > agora) {
      const segundosRestantes = Math.ceil((tempoBloqueio - agora) / 1000);
      throw new Error(`Muitas tentativas. Tente novamente em ${segundosRestantes} segundos.`);
    }
    
    if (tentativasLogin >= 5) {
      tempoBloqueio = Date.now() + (15 * 60 * 1000); // 15 minutos
      throw new Error('Muitas tentativas. Tente novamente em 15 minutos.');
    }
  }

  function registrarTentativaFalha() {
    tentativasLogin++;
    localStorage.setItem('tentativasLogin', tentativasLogin.toString());
    localStorage.setItem('ultimaTentativa', Date.now().toString());
    
    if (tentativasLogin >= 3) {
      mostrarToast(`Cuidado! ${5 - tentativasLogin} tentativas restantes antes do bloqueio.`, 'warning');
    }
  }

  function resetarTentativas() {
    tentativasLogin = 0;
    tempoBloqueio = 0;
    localStorage.removeItem('tentativasLogin');
    localStorage.removeItem('ultimaTentativa');
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
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duracao);
  }

  // === VALIDAÇÃO DE FORMULÁRIO ===
  function inicializarValidacao() {
    // Validação de email
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
      input.addEventListener('blur', validarEmail);
      input.addEventListener('input', limparErro);
    });

    // Validação de senha
    const senhaInputs = document.querySelectorAll('input[type="password"]');
    senhaInputs.forEach(input => {
      input.addEventListener('input', validarForcaSenha);
      input.addEventListener('blur', validarSenha);
      input.addEventListener('input', limparErro);
    });

    // Validação de nome
    const nomeInput = document.getElementById('reg-name');
    if (nomeInput) {
      nomeInput.addEventListener('blur', validarNome);
      nomeInput.addEventListener('input', limparErro);
    }
  }

  function validarEmail(e) {
    const input = e.target;
    const email = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      mostrarErro(input, 'Email é obrigatório');
      return false;
    }
    
    if (!emailRegex.test(email)) {
      mostrarErro(input, 'Digite um email válido');
      return false;
    }
    
    mostrarSucesso(input);
    return true;
  }

  function validarSenha(e) {
    const input = e.target;
    const senha = input.value;
    
    if (!senha) {
      mostrarErro(input, 'Senha é obrigatória');
      return false;
    }
    
    if (senha.length < 6) {
      mostrarErro(input, 'Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    mostrarSucesso(input);
    return true;
  }

  function validarNome(e) {
    const input = e.target;
    const nome = input.value.trim();
    
    if (!nome) {
      mostrarErro(input, 'Nome é obrigatório');
      return false;
    }
    
    if (nome.length < 2) {
      mostrarErro(input, 'Nome deve ter pelo menos 2 caracteres');
      return false;
    }
    
    mostrarSucesso(input);
    return true;
  }

  function validarForcaSenha(e) {
    const input = e.target;
    const senha = input.value;
    const strengthBar = input.parentNode.querySelector('.senha-strength') || criarBarraForcaSenha(input);
    const contador = input.parentNode.querySelector('.contador-senha') || criarContadorSenha(input);
    
    // Atualizar contador
    contador.textContent = `${senha.length}/6 caracteres`;
    
    if (senha.length === 0) {
      strengthBar.className = 'senha-strength';
      contador.className = 'contador-senha';
      return;
    }
    
    let strength = 0;
    if (senha.length >= 6) strength++;
    if (senha.match(/[a-z]/) && senha.match(/[A-Z]/)) strength++;
    if (senha.match(/\d/)) strength++;
    if (senha.match(/[^a-zA-Z\d]/)) strength++;
    
    strengthBar.className = `senha-strength ${
      strength < 2 ? 'senha-fraca' : 
      strength < 4 ? 'senha-media' : 'senha-forte'
    }`;
    
    // Atualizar cor do contador
    contador.className = `contador-senha ${
      senha.length < 6 ? 'fraca' :
      strength < 2 ? 'fraca' :
      strength < 4 ? 'media' : 'forte'
    }`;
  }

  function criarBarraForcaSenha(input) {
    const bar = document.createElement('div');
    bar.className = 'senha-strength';
    input.parentNode.appendChild(bar);
    return bar;
  }

  function criarContadorSenha(input) {
    const contador = document.createElement('div');
    contador.className = 'contador-senha';
    contador.textContent = '0/6 caracteres';
    input.parentNode.appendChild(contador);
    return contador;
  }

  function mostrarErro(input, mensagem) {
    const group = input.parentNode;
    group.classList.remove('valid');
    group.classList.add('invalid');
    
    let errorSpan = group.querySelector('.error-message');
    if (!errorSpan) {
      errorSpan = document.createElement('span');
      errorSpan.className = 'error-message';
      group.appendChild(errorSpan);
    }
    errorSpan.textContent = mensagem;
  }

  function mostrarSucesso(input) {
    const group = input.parentNode;
    group.classList.remove('invalid');
    group.classList.add('valid');
    
    const errorSpan = group.querySelector('.error-message');
    if (errorSpan) {
      errorSpan.style.display = 'none';
    }
  }

  function limparErro(e) {
    const input = e.target;
    const group = input.parentNode;
    group.classList.remove('invalid', 'valid');
    
    const errorSpan = group.querySelector('.error-message');
    if (errorSpan) {
      errorSpan.style.display = 'none';
    }
  }

  function validarFormulario(form) {
    let valido = true;
    
    // Validar todos os campos obrigatórios
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
      if (input.type === 'email' && !validarEmail({ target: input })) {
        valido = false;
      } else if (input.type === 'password' && !validarSenha({ target: input })) {
        valido = false;
      } else if (!input.value.trim()) {
        mostrarErro(input, 'Este campo é obrigatório');
        valido = false;
      }
    });
    
    return valido;
  }

  // === INICIALIZAÇÃO DAS FUNCIONALIDADES ===
  function inicializarTodasFuncionalidades() {
    inicializarValidacao();
    inicializarProtecao();
    
    // Adicionar event listeners para formulários com validação
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        if (!validarFormulario(form)) {
          e.preventDefault();
        }
      });
    });
  }

  // === SEU CÓDIGO ORIGINAL (COM MELHORIAS) ===
  const showLoginBtn = document.getElementById('show-login');
  const showRegisterBtn = document.getElementById('show-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const chkProfessional = document.getElementById('is-professional');
  const profFields = document.getElementById('prof-fields');

  console.log('Elementos encontrados:', {
    showLoginBtn: !!showLoginBtn,
    showRegisterBtn: !!showRegisterBtn,
    loginForm: !!loginForm,
    registerForm: !!registerForm,
    chkProfessional: !!chkProfessional,
    profFields: !!profFields
  });

  // Se elementos não existirem, sair
  if (!showLoginBtn || !showRegisterBtn || !loginForm || !registerForm) {
    console.error('❌ Elementos do formulário não encontrados!');
    console.log('IDs procurados: show-login, show-register, login-form, register-form');
    return;
  }

  // alternar formulários
  function showLogin() {
    console.log('Mostrando login');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  }
  
  function showRegister() {
    console.log('Mostrando registro');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  }

  showLoginBtn.addEventListener('click', showLogin);
  showRegisterBtn.addEventListener('click', showRegister);
  showLogin();

  // mostrar/ocultar campos de profissional
  if (chkProfessional && profFields) {
    chkProfessional.addEventListener('change', () => {
      console.log('Checkbox profissional:', chkProfessional.checked);
      profFields.style.display = chkProfessional.checked ? 'block' : 'none';
    });
  } else {
    console.log('Elementos de profissional não encontrados');
  }

  // LOGIN (COM PROTEÇÃO E LOADING)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      verificarBloqueio();
    } catch (error) {
      mostrarToast(error.message, 'error');
      return;
    }

    if (!validarFormulario(loginForm)) {
      return;
    }

    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-pass').value.trim();
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    console.log('Tentando login com:', { email, senha });

    try {
      setLoading(submitBtn, true);

  const res = await fetch('/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, senha })
      });

      console.log('Status da resposta:', res.status);
      
      const data = await res.json();
      console.log('Dados da resposta:', data);
      
      if (res.ok) {
        console.log('Login bem-sucedido! Salvando no localStorage...');
        resetarTentativas();
        localStorage.setItem('usuarioLogado', JSON.stringify(data));
        mostrarToast('Login realizado com sucesso!', 'success');
        
        console.log('Redirecionando para forum.html...');
        setTimeout(() => {
          window.location.href = 'forum.html';
        }, 1000);
      } else {
        registrarTentativaFalha();
        console.log('Erro no login:', data.mensagem);
        mostrarToast(data.mensagem || 'Erro ao fazer login.', 'error');
      }
    } catch (err) {
      registrarTentativaFalha();
      console.error('Erro completo no login:', err);
      mostrarToast('Erro ao conectar ao servidor.', 'error');
    } finally {
      setLoading(submitBtn, false);
    }
  });

  // CADASTRO (COM VALIDAÇÃO E LOADING)
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validarFormulario(registerForm)) {
      return;
    }

    const nome = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const senha = document.getElementById('reg-pass').value.trim();
    const isProfessional = document.getElementById('is-professional').checked;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    console.log('Tentando cadastro:', { nome, email, isProfessional });

    if (!nome || !email || !senha) {
      mostrarToast('Preencha todos os campos!', 'warning');
      return;
    }

    try {
      setLoading(submitBtn, true);

  const res = await fetch('/usuarios/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          nome, 
          email, 
          senha,
          profissional: isProfessional 
        })
      });

      const data = await res.json();
      console.log('Resposta do cadastro:', data);

      if (res.ok) {
        mostrarToast('Cadastro realizado com sucesso!', 'success');
        localStorage.setItem('usuarioLogado', JSON.stringify({ 
          nome, 
          email, 
          profissional: isProfessional 
        }));
        
        setTimeout(() => {
          window.location.href = 'forum.html';
        }, 1000);
      } else {
        mostrarToast(data.mensagem || 'Erro ao cadastrar.', 'error');
      }
    } catch (err) {
      console.error('Erro no cadastro:', err);
      mostrarToast('Erro ao conectar ao servidor.', 'error');
    } finally {
      setLoading(submitBtn, false);
    }
  });

  // Inicializar todas as funcionalidades
  inicializarTodasFuncionalidades();

  console.log('✅ Script carregado com sucesso!');
});