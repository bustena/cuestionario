  <script>
    const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWaOkwY6kbuOSZki8LQxkvpa97vF1KSN5MCmFRr4tG13BFSvRsuSG_XPLDrxIiKDyIWtzB7k-6_vRI/pub?output=csv";

    let preguntasGlobales = [];
    let indiceActual = 0;
    let respuestasUsuario = [];
    let puntosCorrecta = 0;
    let puntosIncorrecta = 0;

    function mostrarError(mensaje) {
      const errorDiv = document.getElementById('error');
      errorDiv.textContent = mensaje;
      errorDiv.style.display = 'block';
    }

    function limpiarError() {
      const errorDiv = document.getElementById('error');
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }

    function parseRangos(texto) {
      const unidades = new Set();
      texto.split(',').forEach(p => {
        if (p.includes('-')) {
          const [inicio, fin] = p.split('-').map(n => parseInt(n.trim()));
          for (let i = inicio; i <= fin; i++) unidades.add(i.toString());
        } else {
          unidades.add(p.trim());
        }
      });
      return unidades;
    }

    function comenzarCuestionario() {
      limpiarError();
      const btn = document.getElementById('btnComenzar');
      btn.disabled = true;

      const unidades = parseRangos(document.getElementById('unidades').value.trim());
      const numPreguntas = parseInt(document.getElementById('numPreguntas').value);
      if (unidades.size === 0 || isNaN(numPreguntas) || numPreguntas < 1) {
        mostrarError('Introduce unidades válidas y un número de preguntas mayor que cero.');
        btn.disabled = false;
        return;
      }

      puntosCorrecta = +(10 / numPreguntas).toFixed(2);
      puntosIncorrecta = +(-5 / numPreguntas).toFixed(2);

      Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          const datos = results.data;
          const preguntasFiltradas = datos.filter(p => unidades.has(String(p.UNIDAD).trim()));
          if (preguntasFiltradas.length === 0) {
            mostrarError('No se encontraron preguntas para esas unidades.');
            btn.disabled = false;
            return;
          }

          preguntasFiltradas.sort(() => Math.random() - 0.5); // aleatorizar
          preguntasGlobales = preguntasFiltradas.slice(0, numPreguntas).map(p => ({
            pregunta: p.PREGUNTA,
            opciones: [p.RES_A, p.RES_B, p.RES_C],
            correcta: p.CORRECTA.toLowerCase().trim()
          }));

          indiceActual = 0;
          respuestasUsuario = [];
          document.getElementById('inicio').style.display = 'none';
          mostrarPregunta();
          setTimeout(actualizarIcono, 100);
        },
        error: function() {
          mostrarError('Error al cargar preguntas. Inténtalo de nuevo.');
          btn.disabled = false;
        }
      });
    }

    function mostrarPregunta() {
      const contenedor = document.getElementById('cuestionario');
      contenedor.innerHTML = '';
      const item = preguntasGlobales[indiceActual];
      const bloque = document.createElement('div');
      bloque.className = 'question';
      bloque.innerHTML = `<p>${indiceActual + 1}. ${item.pregunta}</p>`;

      const opcionesDiv = document.createElement('div');
      opcionesDiv.className = 'options';

      item.opciones.forEach((opcion, i) => {
        const letra = String.fromCharCode(97 + i);
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'opcion';
        input.value = letra;
        input.addEventListener('change', () => {
          document.querySelectorAll('.options label').forEach(l => l.classList.remove('selected'));
          label.classList.add('selected');
        });

        const span = document.createElement('span');
        span.className = 'option-text';
        span.textContent = opcion;

        label.appendChild(input);
        label.appendChild(span);
        opcionesDiv.appendChild(label);
      });

      bloque.appendChild(opcionesDiv);

      const nota = document.createElement('div');
      nota.className = 'nota';
      nota.textContent = `Cada acierto suma ${puntosCorrecta}, cada fallo resta ${Math.abs(puntosIncorrecta)}. No contestar no puntúa.`;
      bloque.appendChild(nota);

      const btn = document.createElement('button');
      btn.textContent = (indiceActual < preguntasGlobales.length - 1) ? 'Siguiente' : 'Enviar respuestas';
      btn.onclick = registrarRespuesta;
      bloque.appendChild(btn);

      contenedor.appendChild(bloque);
      contenedor.style.display = 'block';
    }

    function registrarRespuesta() {
      const seleccionada = document.querySelector('input[name=opcion]:checked');
      const seleccion = seleccionada ? seleccionada.value : null;
      respuestasUsuario.push(seleccion);

      const item = preguntasGlobales[indiceActual];
      const correcta = item.correcta;

      document.querySelectorAll('.options label').forEach(label => {
        const input = label.querySelector('input');
        if (input.value === correcta) label.classList.add('correcta');
        else if (input.checked) label.classList.add('incorrecta');
        input.disabled = true;
      });

      setTimeout(() => {
        indiceActual++;
        if (indiceActual < preguntasGlobales.length) {
          mostrarPregunta();
        } else {
          document.getElementById('cuestionario').style.display = 'none';
          mostrarResultado();
          setTimeout(actualizarIcono, 100);
        }
      }, 1000);
    }

    function mostrarResultado() {
      let aciertos = 0, fallos = 0;
      preguntasGlobales.forEach((p, i) => {
        const r = respuestasUsuario[i];
        if (!r) return;
        if (r === p.correcta) aciertos++;
        else fallos++;
      });
      const puntuacion = aciertos * puntosCorrecta + fallos * puntosIncorrecta;

      const div = document.getElementById('resultado');
      const noContestadas = preguntasGlobales.length - aciertos - fallos;
      div.innerHTML = `
        <h1>Resultado</h1>
        <div class="result">
          <p><strong>Aciertos:</strong> ${aciertos}</p>
          <p><strong>Fallos:</strong> ${fallos}</p>
          <p><strong>No contestadas:</strong> ${noContestadas}</p>
          <p><strong>Puntuación final:</strong> ${puntuacion.toFixed(2)} / 10</p>
        </div>
        <button onclick="location.reload()">Volver a empezar</button>
      `;
      div.style.display = 'block';
    }

    function actualizarIcono() {
      const icono = document.getElementById("iconoCuestionario");
      icono.style.width = (document.getElementById("inicio").style.display !== "none") ? "100px" : "50px";
    }

    document.getElementById("btnComenzar").addEventListener("click", comenzarCuestionario);
    document.addEventListener("DOMContentLoaded", actualizarIcono);
    document.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const inicioVisible = document.getElementById("inicio").style.display !== "none";
        const cuestionarioVisible = document.getElementById("cuestionario").style.display !== "none";
        if (inicioVisible) comenzarCuestionario();
        else if (cuestionarioVisible) registrarRespuesta();
      }
    });
  </script>
