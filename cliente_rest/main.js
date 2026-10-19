console.log("main cargado");



const ubi_select =document.getElementById('ubicacion');
const mod_select = document.getElementById('modelo');
const est_select = document.getElementById('estado');
const cat_select = document.getElementById('categoria');

const ubi_select2 = document.getElementById('ubicacion_rec');
const mod_select2 = document.getElementById('modelo_rec');
const est_select2 = document.getElementById('estado_rec');
const cat_select2 = document.getElementById('categoria_rec');

const renyas_tabla = document.getElementById("lista_resenyas");
const reservas_tabla = document.getElementById("lista_reservas");
const ranking_tabla = document.getElementById("lista_ranking");

var areasMedicas = {
    "Alergología": 1,
    "Anestesiología": 2,
    "Cardiología": 3,
    "Cirugía General": 4,
    "Dermatología": 5,
    "Aparato Digestivo": 6,
    "Endocrinología": 7,
    "Ginecología": 8,
    "Hematología": 9,
    "Medicina Interna": 10,
    "Neumología": 11,
    "Neurología": 12,
    "Oftalmología": 13,
    "Oncología": 14,
    "Pediatría": 15,
    "Psiquiatría": 16,
    "Traumatología": 17,
    "Urología": 18
};
var token = null;
var recurso_actual_id = null;
// ws.js - cliente gestor
var conexionWS = null;
var nombre_gestor_ws = null;
var id_gestor_ws = null;

function conectarWS(id, nombre) {
    id_gestor_ws = id;
    nombre_gestor_ws = nombre;

    conexionWS = new WebSocket("ws://localhost:4444", "avisos");

    conexionWS.addEventListener("open", function() {
        console.log("Ya estoy conectado con el servidor");
        // Identificarse como gestor
        conexionWS.send(JSON.stringify({
            operacion: "identificar",
            tipo: "gestor",
            id: id,
            nombre: nombre
        }));
    });

    conexionWS.addEventListener("message", function(msg) {
        var datos = JSON.parse(msg.data);
        if (datos.operacion === "aviso") {
            anyadirAviso(datos);
        }
    });
}

function desconectarWS() {
    if (conexionWS) {
        conexionWS.close();
        conexionWS = null;
    }
}
var AREAS = {
    1:"Alergología",2:"Anestesiología",3:"Cardiología",4:"Cirugía General",
    5:"Dermatología",6:"Aparato Digestivo",7:"Endocrinología",8:"Ginecología",
    9:"Hematología",10:"Medicina Interna",11:"Neumología",12:"Neurología",
    13:"Oftalmología",14:"Oncología",15:"Pediatría",16:"Psiquiatría",
    17:"Traumatología",18:"Urología"
};
function formatearFecha(f) {
    if (f == null) return null;
    var d = new Date(f);
    var mes = String(d.getMonth() + 1).padStart(2, "0");
    var dia = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mes + "-" + dia;
}

var id_area = 3;
function enviarReservas() { //solo una ? si hay varias query &.

    rest.get("/api/recursos?categoria=Todos&modelo=Todos&ubicacion=Todos&estado=Todos&token="+token, function(estado, recursos) {
        if (estado != 200) {
            alert("No se han podido obtener los recursos");
            return;
        }
        console.log("Tenemos los recursos.")
        console.log(recursos.length)

        var totalRecursos = recursos.length;
        var contadorRecursos = 0;
        var datosr = []; // Array donde guardaremos todo

        if (totalRecursos === 0) return; // Por si no hay recursos

        for (let i = 0; i < recursos.length; i++) {
            
            // CORRECCIÓN: Usar recursos[i].id en lugar de id suelto
            rest.get("/api/recursos/" + recursos[i].id + "/reservas"+"?token=" + token, function(estado, reservas) { 
                
                if (estado == 200 && reservas) {
                    for (let j = 0; j < reservas.length; j++) {
                        // CORRECCIÓN: Usar la j del bucle, no la i
                        let reserva_actual = reservas[j]; 
                        let nueva_reserva = {
                            nombre: reserva_actual.sanitario_nombre,
                            apellidos: reserva_actual.sanitario_apellidos,
                            categoria: recursos[i].categoria,
                            horas_estimadas: reserva_actual.horas_estimadas,
                            fec_pet: formatearFecha(reserva_actual.fecha_peticion),
                            fec_ini: formatearFecha(reserva_actual.fecha_inicio),
                            fecha_fin: formatearFecha(reserva_actual.fecha_fin)
                        };
                        // CORRECCIÓN: empujar a datosr
                        datosr.push(nueva_reserva); 
                    }
                }
                
                contadorRecursos++;

                // Cuando todas las peticiones GET han terminado, hacemos el POST
                if (contadorRecursos == totalRecursos) {
                    console.log("Todas las reservas han sido cargadas");

                    // EL POST DEBE IR AQUÍ DENTRO, cuando datosr ya está lleno. Si lo pongo fuera, el datosr, va a estar sin acabar. 
                    var fecha = formatearFecha(new Date());

                    var envio = {
                        id_area: id_area, // Asegúrate de que id_area esté definida en otro lado
                        fecha: fecha,
                        datos: datosr // CORRECCIÓN: Mandar datosr, no la variable reservas
                    };
                    console.log("construimos la respuesta")

                    rest.post("https://undefined.ua.es/telemedicina/api/datos", envio, function(estado2, respuesta) {
                        if (estado2 == 200 || estado2 == 201) {
                            alert("Reservas enviadas al Ministerio");
                        } else {
                            console.log("Error en el POST", estado2, respuesta);
                            alert("Error al enviar las reservas");
                        }
                    });
                }
            }); // <-- Faltaba cerrar bien este callback
        }
    });
}
function buscarRanking(){
    ranking_tabla.innerHTML = "";
    rest.get("https://undefined.ua.es/telemedicina/api/datos?token="+token, function(estado, envios){
        if(estado != 200 || !Array.isArray(envios)){
            console.log("Error al obtener los datos del ministerio", estado);
            return;
        }

        var ranking = calcularRanking(envios); //una vez obtenido el ranking, construimos la tabla.

        for(var i = 0; i < ranking.length; i++){
            var fila = document.createElement("tr");

            var tdPos = document.createElement("td");
            tdPos.textContent = i + 1;
            fila.appendChild(tdPos);

            var tdArea = document.createElement("td");
            tdArea.textContent = ranking[i].nombre;
            fila.appendChild(tdArea);

            var tdTotal = document.createElement("td");
            tdTotal.textContent = ranking[i].total;
            fila.appendChild(tdTotal);

            ranking_tabla.appendChild(fila);
        }
    });
}
function calcularRanking(envios){ //preguntar si estas comprobaciones están bien y si son suficientes.
    var totales = {};      // {id_area: nº reservas}
    var vistas = {};       // para descartar duplicados

    for(var i = 0; i < envios.length; i++){//lista de todos los objetos enviados.
        var envio = envios[i]; //esto es un objeto
        var area = parseInt(envio.id_area);

        // limpieza de basura: área válida y datos es un array
        if(isNaN(area) || area < 1 || area > 18) continue;
        if(!Array.isArray(envio.datos)) continue;

        for(var j = 0; j < envio.datos.length; j++){//miramos cada una de las reservas que hay dentro del objeto en datos.
            var r = envio.datos[j];

            // reserva válida: mínimo nombre, apellidos y categoría
            if(!r || !r.nombre || !r.apellidos || !r.categoria) continue; //saltamos las reservas basura.

            // clave única para no contar dos veces la misma reserva
            var clave = area + "|" + r.nombre + "|" + r.apellidos + "|" + r.categoria
                      + "|" + r.fec_pet + "|" + r.fec_ini + "|" + r.horas_estimadas;
            if(vistas[clave]) continue; //si está, no la metemos.
            vistas[clave] = true;

            totales[area] = (totales[area] || 0) + 1; //contamos las totales por área.
        }
    }

    // pasar a array y ordenar de mayor a menor
    var ranking = [];
    for(var a in totales){
        ranking.push({id_area: parseInt(a), nombre: AREAS[a], total: totales[a]});
    }
    ranking.sort(function(x, y){ return y.total - x.total; }); //ordenamos en orden descendente.
    return ranking;
}

function anyadirAviso(datos) {
    var tabla = document.getElementById("lista_avisos");
    var fila = document.createElement("tr");

    if (datos.color === "verde") fila.style.backgroundColor = "#90ee90";
    else if (datos.color === "rojo") fila.style.backgroundColor = "#ff9999";
    else if (datos.color === "azul") fila.style.backgroundColor = "#9999ff";

    var tdFecha = document.createElement("td");
    tdFecha.textContent = datos.fecha;
    var tdOrigen = document.createElement("td");
    tdOrigen.textContent = datos.origen;
    var tdTexto = document.createElement("td");
    tdTexto.textContent = datos.texto;

    fila.appendChild(tdFecha);
    fila.appendChild(tdOrigen);
    fila.appendChild(tdTexto);
    tabla.appendChild(fila);
}

// Para enviar aviso de nuevo recurso (llamado desde main.js)
function wsAvisoNuevoRecurso(nombreCategoria, nombreModelo, codigoRecurso) {
    if (!conexionWS) return;
    conexionWS.send(JSON.stringify({
        operacion: "avisoNuevoRecurso",
        nombreCategoria: nombreCategoria,
        nombreModelo: nombreModelo,
        codigoRecurso: codigoRecurso,
        quien: nombre_gestor_ws
    }));
}
document.addEventListener("DOMContentLoaded", function(){

    cargarCategorias();
    cargarModelos();
    cargarUbis();
    cargarEstados();
// para que los modelos se actualicen una vez elijamos categoría.
    cat_select.addEventListener("change", function(){
            actualizarModelos();
        });
    cat_select2.addEventListener("change", function(){
            actualizarModelos();
        });
// cuando se cargue todo el html, ejecutamos las funciones para cargar los selects de inicio.


});

function anyadir(){
    recurso_actual_id = null; // IMPORTANTE
    cambiarSeccion("recurso");

    document.getElementById("num_serie_rec").value = "";
    document.getElementById("modelo_rec").selectedIndex = 0;
    document.getElementById("categoria_rec").selectedIndex = 0;
    document.getElementById("ubicacion_rec").selectedIndex = 0;
    document.getElementById("estado_rec").selectedIndex = 0;
    document.getElementById("lista_reservas").innerHTML = "";
    document.getElementById("lista_resenyas").innerHTML = "";

    inicializarSelectsRecurso();
}
function inicializarSelectsRecurso() {
    // Rellenar categor�as (igual que en el selector principal)
    cat_select2.innerHTML = '<option value="">Seleccione categor�a</option>';
    categorias_lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        cat_select2.appendChild(opt);
    });
    
    // Rellenar ubicaciones
    ubi_select2.innerHTML = '<option value="">Seleccione ubicaci�n</option>';
    ubis_lista.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre;
        ubi_select2.appendChild(opt);
    });
    
    // Rellenar estados
    const estados = [
        { id: 0, nombre: "Operativo" },
        { id: 1, nombre: "De baja/defectuoso" },
        { id: 2, nombre: "En mantenimiento" },
    ];
    
    est_select2.innerHTML = '<option value="">Seleccione estado</option>';
    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        est_select2.appendChild(option);
    });
    
    // Modelos vac�o inicialmente (se llenar� al seleccionar categor�a)
    mod_select2.innerHTML = '<option value="">Primero seleccione categor�a</option>';
}
//Para cargar los selects, el cliente necesita conocer las categorias, modelos, ubis...
function cargarCategorias(){
    rest.get("/api/categorias"+"?token=" + token, function(estado,respuesta){
        if(estado == 200){
            categorias_lista = respuesta; //guardamos las categorías.
            rellenarCategorias();
        }
    });
}

function cargarModelos(){
    rest.get("/api/modelos"+"?token=" + token, function(estado,respuesta){
        if(estado == 200){
            modelos_lista = respuesta; //guardamos los modelos.
        }
    });
}

function cargarUbis(){
    rest.get("/api/ubicaciones"+"?token=" + token, function(estado,respuesta){
        if(estado == 200){
            ubis_lista = respuesta; //guardamos las ubicaciones.
            rellenarUbicaciones();
        }
    });
}
function cargarEstados() {

    const estados = [
        { id: 0, nombre: "Operativo" },
        { id: 1, nombre: "De baja/defectuoso" },
        { id: 2, nombre: "En mantenimiento" },

    ];

    est_select.innerHTML = "";
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    est_select.appendChild(todos);

    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        est_select.appendChild(option);

    });
}

function rellenarCategorias(){
    // ponemos en el select un option "decorativo"
    cat_select.innerHTML = "";
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    cat_select.appendChild(todos);
    
    categorias_lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        cat_select.appendChild(opt); //para cada categoria, creamos un option y lo añadimos al select.

    });
    
}
//hacemos lo mismo con las ubis.
function rellenarUbicaciones(){
    ubi_select.innerHTML = "";
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    ubi_select.appendChild(todos);
    ubis_lista.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre;
        ubi_select.appendChild(opt);


    });
    
}
function actualizarModelos(){

    var categoriaSeleccionada = document.getElementById("categoria").value;
    var categoriaSeleccionada2 = document.getElementById("categoria_rec").value;
    mod_select.innerHTML = '<option value="">Seleccione modelo</option>';
    mod_select2.innerHTML = '<option value="">Seleccione modelo</option>';
    // ponemos en los selects los option de los modelos que pertenecen a las categorias seleccionadas.
    modelos_lista.forEach(m => {
        if(m.categoria == categoriaSeleccionada){
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.nombre;
            mod_select.appendChild(opt);
        }
    });
    modelos_lista.forEach(m => { //el for each hace como categorias[i]
        if(m.categoria == categoriaSeleccionada2){
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.nombre;
            mod_select2.appendChild(opt);
        }
    })
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    mod_select.appendChild(todos);
}

var seccionActual = "login";
var gestor_identificador = "";

    /*function entrar(){
        var usuario = document.getElementById("usuario").value;
    
    cambiarSeccion("menu-principal");
    }*/
    var modelos_lista =  [];
    var ubis_lista = [];
    var categorias_lista = [];
    var recurso = [];


    function login(){ // al darle al botón, puedes ir a una vista u otra
    gestor = {        //eso depende de la respuesta del servidor, por lo que hay petición.
        usuario : document.getElementById("usuario").value,
        password : document.getElementById("password").value
    };
    
    rest.post("/api/gestores/login", gestor, function(estado, respuesta){
        if(estado == 200){
            // Guardar el identificador del gestor (solo el ID)
            console.log(respuesta)
            token = respuesta.token;
            gestor_identificador = respuesta.usuario; // respuesta es el ID del gestor
            // Ahora obtener los datos completos del gestor usando el ID
            rest.get("/api/gestores/" + gestor_identificador+"?token=" + token, function(estado, respuesta) {
                if(estado == 200) {
                    // respuesta contiene: {id, nombre, apellidos, usuario}
                    var nombreCompleto = respuesta.nombre + " " + (respuesta.apellidos || "");
                    
                    // Guardar en una variable global para usarla despu�s
                    window.nombreGestorCompleto = nombreCompleto;

                    conectarWS(gestor_identificador, nombreCompleto); //Mandamos para que se conecte al WebSocket
                    
                    // Cambiar a la secci�n de inicio
                    cambiarSeccion("inicio");
                    
                    // Cargar todos los datos necesarios
                    cargarModelos();
                    cargarUbis();
                    cargarCategorias();
                    
                    // Mostrar el nombre del gestor
                    document.getElementById("nombre_gestor").textContent = nombreCompleto;
                } else {
                    // Si falla la obtenci�n de datos, al menos mostrar el usuario
                    window.nombreGestorCompleto = document.getElementById("usuario").value;
                    cambiarSeccion("inicio");
                    cargarModelos();
                    cargarUbis();
                    cargarCategorias();
                    document.getElementById("nombre_gestor").textContent = window.nombreGestorCompleto;
                }
            });
        } else {
            alert("Error en login: " + (respuesta.error || "Credenciales incorrectas"));
        }
    });
}
    function registro(){
    var gestor = {
        nombre: document.getElementById("nombre_reg").value,
        apellidos: document.getElementById("apellidos_reg").value,
        usuario: document.getElementById("usuario_reg").value,
        password: document.getElementById("contrasenya_reg").value,
    };

    if(gestor.nombre!="" && gestor.apellidos!="" && gestor.usuario!="" && gestor.password!=""){

    if(gestor_identificador === ""){ //no ha hecho nunca login, si lo hubiera hecho, tendría guardado el id.
        // REGISTRO NUEVO
        rest.post("/api/gestores", gestor, function (estado, respuesta) {
            console.log(respuesta)
            if (estado == 201) {
                cambiarSeccion("login");
            } else {
                alert("Error introduciendo nuevo gestor");
            }
        });
    } else { //si ya ha hecho login, haremos una modificación de datos, no creacion (put)
        // EDICI�N - Primero obtener los datos actuales del gestor. Para luego ver que vista ponemos.
        rest.get("/api/gestores/" + gestor_identificador +"?token=" + token, function(estado, respuesta) {
            if (estado == 200) {
                var gestorActual = respuesta;
                
                // Comparar usuario y contrase�a actuales con los nuevos
                var usuarioCambiado = (gestorActual.usuario !== gestor.usuario);
                var passwordCambiado = (gestorActual.password !== gestor.password); // Asumiendo que la respuesta incluye la password
                
                // Hacer la petici�n PUT para actualizar
                rest.put("/api/gestores/" + gestor_identificador +"?token=" + token, gestor, function (estado, respuesta) {
                    if (estado == 200) {
                        // Si cambi� usuario o contrase�a, redirigir a login
                        if (usuarioCambiado || passwordCambiado) {
                            alert("Usuario o contrase�a modificados. Por favor, inicie sesi�n nuevamente.");
                            gestor_identificador = ""; // Limpiar el identificador
                            cambiarSeccion("login");
                        } else {
                            // Si no cambiaron credenciales, volver al inicio
                            cambiarSeccion("inicio");
                        }
                    } else {
                        alert("Error editando gestor");
                    }
                });
            } else {
                alert("Error obteniendo datos del gestor");
            }
        });
    }
}
else{
    alert("Rellene todos los campos.");
    cambiarSeccion("datos_gestor");
}
}

    function cancelar(){
        if(gestor_identificador != ""){
            cambiarSeccion("inicio")
        }else{
            cambiarSeccion("login");
        }
    }
    
    function editar(){
        cambiarSeccion("datos_gestor");
    }
//TODO LO QUE DEPENDA DE LA RESPUESTA DEL SERVIDOR: TIENE QUE IR EN EL CALLBACK.
    function buscar(){
        console.log("entro a buscar");
        var num_serie = "";
        var categoria = document.getElementById("categoria").value;
        console.log(categoria);
        var modelo = document.getElementById("modelo").value;
        var ubicacion = document.getElementById("ubicacion").value;
        var estado = document.getElementById("estado").value
        console.log("numero serie")
        console.log("Entro en la función.")
        rest.get("/api/recursos?categoria="+categoria+"&modelo="+modelo+"&ubicacion="+ubicacion+"&estado="+estado+"&token="+token,function(estado,respuesta){
        //le pedimos al servidor que nos devuelva la lista de recursos filtrada.
            var recursos_mostrar = respuesta;
            console.log("RECURSOS RECIBIDOS:", recursos_mostrar); // <-- A�ADE ESTO
            console.log("Primer recurso:", recursos_mostrar[0]);
            //tienen que ser iguales que los .query que hay en el servidor
            var lista = document.getElementById("lista_recursos");
            lista.innerHTML=""; // aquí no tiene un value (<tbody>value</tbody>), tiene contenido. RECORDAR VALUE O INNER O TEXTOCONTENT.
            // tenemos que utilizar las funciones de carga para tener acceso a todos modelos , categorias y demás.
            for(var i = 0;i < recursos_mostrar.length;i++){
                var tr = document.createElement("tr"); //creamos una fila.
                var td_numserie = document.createElement("td"); //columna.
                td_numserie.textContent = recursos_mostrar[i].numero_serie; // podría poner directamente el que introduce.
                tr.appendChild(td_numserie);
                // MODELO + CATEGORIA
                var td_modelo = document.createElement("td");

                var td_categoria = document.createElement("td");

                td_modelo.textContent = recursos_mostrar[i].modelo;

                td_categoria.textContent = recursos_mostrar[i].categoria;
            
                tr.appendChild(td_categoria);
                tr.appendChild(td_modelo);

                var td_ubi = document.createElement("td");
                td_ubi.textContent = recursos_mostrar[i].ubicacion; // la respuesta nos da los ids, no el nombre.
                tr.appendChild(td_ubi);

                var td_estado = document.createElement("td")
                td_estado.textContent = recursos_mostrar[i].estado;
                tr.appendChild(td_estado);

                var boton_abrir = document.createElement("button")
                let identificador_recurso = recursos_mostrar[i].id;
                console.log(identificador_recurso);
                boton_abrir.addEventListener("click",function(){ //addEventListener se ejecuta con el click, y para ese momento el for ha acabado por tanto se guarda el id.
                    abrir(identificador_recurso);
                })
                boton_abrir.textContent = "Abrir";
                tr.appendChild(boton_abrir);
                var boton_eliminar = document.createElement("button")
                boton_eliminar.textContent = "X"
                boton_eliminar.addEventListener("click",function(){
                    eliminarRecurso(identificador_recurso);
                })
                tr.appendChild(boton_eliminar);


                lista.appendChild(tr);
            }
        })

    }
    function eliminarRecurso(id){
        rest.delete("/api/recursos/"+id +"?token=" + token,function(estado,respuesta){
            if(estado == 200){
                alert("Recurso eliminado");
                buscar();
            }else{
                console.log("ERrro")
            }

        })

        

    }

    

    function cambiarSeccion(seccion){
    document.getElementById(seccionActual).classList.remove("activa");
    document.getElementById(seccion).classList.add("activa");
    seccionActual=seccion;
    if (seccion === "inicio" && window.nombreGestorCompleto) {
        var nombreElement = document.getElementById("nombre_gestor");
        if (nombreElement) {
            nombreElement.textContent = window.nombreGestorCompleto;
        }
    }
    }
    function iniciar_registro(){ // al darle al botón solo queremos que cambie de vista.
        gestor_identificador = "";
        
        cambiarSeccion("datos_gestor");

        //LIMPIAMOS TODOS LOS CAMPOS
        document.getElementById("nombre_reg").value = "";
        document.getElementById("apellidos_reg").value = "";
        document.getElementById("usuario_reg").value = "";
        document.getElementById("contrasenya_reg").value = "";

    }
    function salir(){
        gestor_identificador = "";
        //LIMPIAMOS LOS CAMPOS
        document.getElementById("usuario").value = "";
        document.getElementById("password").value = "";
        desconectarWS(); // Cuando te salgas habrá que desconectarlo del WS.
        lista_avisos.innerHTML = ""; // Limpiar avisos al salir
        cambiarSeccion("login");
    }
    function seleccionarSelectRec(id){ //preguntar.
        rest.get("/api/recursos/"+id +"?token=" + token, function(estado, respuesta){
            console.log(respuesta);
            if(estado == 200){
                console.log(respuesta.numero_serie);
                est_select2.innerHTML = "";
                for(var j = 0; j < 3; j++){
                    var opt = document.createElement("option");
                    if(j == 0){
                        opt.textContent = "Operativo";
                        opt.value = 0;
                    }else if(j == 1){
                        opt.textContent = "De baja/defectuoso";
                        opt.value = 1;
                    }else{  
                        opt.textContent = "Mantenimiento";
                        opt.value = 2;
                    }
                    est_select2.appendChild(opt);
                }
                
                // Establecer el n�mero de serie
                document.getElementById("num_serie_rec").value = respuesta.numero_serie; //inputs van con value.
                //estableces estado
                document.getElementById("estado_rec").value = respuesta.estado;
                cat_select2.value = respuesta.categoria;
                mod_select2.value = respuesta.modelo;
                ubi_select2.value = respuesta.ubicacion;
                rellenarReservas(id);
                rellenarResenyas(id);
                
            }
        });
    }
function abrir(id){
    var id_recurso = id;
    recurso_actual_id = id;
    cambiarSeccion("recurso");
    var contador = 0
    var fin = false;
    rest.get("/api/categorias" +"?token=" + token,function(estado,respuesta){
        if(estado == 200){
            cat_select2.innerHTML = "";
            for(var i = 0; i < respuesta.length;i++){
                var opt = document.createElement("option");
                opt.value = respuesta[i].id;
                opt.textContent = respuesta[i].nombre;
                cat_select2.appendChild(opt);
            }
            contador++;
            if(contador == 3){
                fin = true;
                if(fin){
                    seleccionarSelectRec(id_recurso);
                }
            }
        }else{
            console.log("Error en la obtencion de cats.")
        }
    })
    rest.get("/api/modelos" +"?token=" + token,function(estado,respuesta){
        if(estado == 200){
            mod_select2.innerHTML = "";
            for(var j = 0; j < respuesta.length; j++){
                var opt = document.createElement("option");
                opt.value = respuesta[j].id;
                opt.textContent = respuesta[j].nombre;
                mod_select2.appendChild(opt);

            }
            contador++;
            if(contador == 3){
                fin = true;
                if(fin){
                    seleccionarSelectRec(id_recurso);
                }
            }
        }else{
            console.log("error en la consulta de modelos")
        }
    })
    rest.get("/api/ubicaciones" +"?token=" + token,function(estado,respuesta){
        if(estado == 200){
            ubi_select2.innerHTML = "";
            for(var k = 0; k < respuesta.length; k++){
                var opt = document.createElement("option");
                opt.value = respuesta[k].id;
                opt.textContent = respuesta[k].nombre;
                ubi_select2.appendChild(opt);
            }
            contador++;
            if(contador == 3){
                fin = true;
                if(fin){
                    seleccionarSelectRec(id_recurso);
                }

            }
        }else{
            console.log("error en la consulta de ubis")
        }
    })
    
}
    function rellenarReservas(id){
        var lista_reservas = [];
        //necesitamos conocer las reservas de un recurso.
        rest.get("/api/recursos/"+id+"/reservas"+"?token=" + token,function(estado,respuesta){
            if(estado == 200){
                lista_reservas = respuesta;
                reservas_tabla.innerHTML = "";
                console.log("lista reservas" +lista_reservas);
                for(var i = 0 ; i < lista_reservas.length; i++){ // un mismo recurso, puede tener varias reservas.
                    
                    var fila = document.createElement("tr") // hacemos esto para cada reserva del recurso.
                    var sanitario = document.createElement("td");
                    sanitario.textContent = lista_reservas[i].sanitario;
                    fila.appendChild(sanitario);
                    var horas = document.createElement("td");
                    horas.textContent = lista_reservas[i].horas_estimadas;
                    fila.appendChild(horas);
                    var fecha_pet = document.createElement("td");
                    fecha_pet.textContent = lista_reservas[i].fecha_peticion;
                    fila.appendChild(fecha_pet);
                    var fecha_ini = document.createElement("td");
                    fecha_ini.textContent = lista_reservas[i].fecha_inicio;
                    fila.appendChild(fecha_ini);
                    var fecha_end = document.createElement("td");
                    fecha_end.textContent = lista_reservas[i].fecha_fin;
                    fila.appendChild(fecha_end);
                    if(lista_reservas[i].fecha_fin == null && lista_reservas[i].fecha_inicio == null){
                        fila.style.backgroundColor = "green";
                    }else if(lista_reservas[i].fecha_fin == null){ //he metido esto.
                            // está en uso: calculamos si se ha superado el tiempo estimado
                            var inicio = new Date(lista_reservas[i].fecha_inicio);
                            var ahora = new Date();
                            var horasTranscurridas = (ahora - inicio) / (1000 * 60 * 60); // milisegundos → horas

                            if(horasTranscurridas > lista_reservas[i].horas_estimadas){
                                fila.style.backgroundColor = "red";
                            } else {
                                fila.style.backgroundColor = "blue";
                            }
                    }
                    reservas_tabla.appendChild(fila);
                }
            }

        })

    }
    function rellenarResenyas(id){
        var lista_resenyas = []
        rest.get("/api/recursos/"+id+"/resenyas"+"?token=" + token,function(estado,respuesta){
            if(estado == 200){
                lista_resenyas = respuesta;
                renyas_tabla.innerHTML = "";
                console.log("lista resenyas" + lista_resenyas);
                for(var i = 0; i < lista_resenyas.length; i++){ //un mismo recurso puede tener varias resenyas.
                var fila = document.createElement("tr");
                
                var fecha = document.createElement("td");
                fecha.textContent = lista_resenyas[i].fecha;
                fila.appendChild(fecha);
                
                var sanitario = document.createElement("td");
                sanitario.textContent = lista_resenyas[i].sanitario;
                fila.appendChild(sanitario);
                
                var valoracion = document.createElement("td");
                valoracion.textContent = lista_resenyas[i].valor + "/5";
                fila.appendChild(valoracion);
                
                var comentario = document.createElement("td");
                comentario.textContent = lista_resenyas[i].descripcion;
                fila.appendChild(comentario);
                
                
                
                renyas_tabla.appendChild(fila);
            }

            }
    })
}

    function guardar_recurso(){
        var inputNumSerie = document.getElementById("num_serie_rec");
    console.log("INPUT NUMERO SERIE:", inputNumSerie); // ?? �Existe el elemento?
    console.log("VALOR DEL INPUT:", inputNumSerie.value); // ?? �Qu� valo

    var recurso = {
        numero_serie : document.getElementById("num_serie_rec").value,
        modelo : document.getElementById("modelo_rec").value,
        ubicacion : document.getElementById("ubicacion_rec").value,
        estado : document.getElementById("estado_rec").value
    };
    console.log(recurso);
    
    



    if(recurso_actual_id != null){ 
        // EDITAR
        rest.put("/api/recursos/" + recurso_actual_id, recurso+"?token=" + token, function(estado,respuesta){
            if(estado == 200){
                alert("Recurso actualizado");
            }
        });
    } else {
        // CREAR
        rest.post("/api/recursos"+"?token=" + token, recurso, function(estado,respuesta){
            if(estado == 201){
                alert("Recurso creado");
                var modeloObj = modelos_lista.find(m => m.id == recurso.modelo);
                var categoriaObj = categorias_lista.find(c => c.id == modeloObj.categoria); //Cogemos la categoria y el modelo del recurso y lo mandamos por el WS.
                wsAvisoNuevoRecurso(categoriaObj.nombre, modeloObj.nombre, recurso.numero_serie);
            }
        });
    }
}

function volver(){
    cambiarSeccion("inicio");
    //Indicamos que los selects marquen la opción por defecto. 
    document.getElementById("categoria").value = "";
    document.getElementById("modelo").value = "";
    document.getElementById("ubicacion").value = "";
    document.getElementById("estado").value = "";
    //los option se mantienen cargados.
    buscar();
}

    


