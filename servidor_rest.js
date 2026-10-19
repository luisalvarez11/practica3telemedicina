var express = require("express");
var jwt = require('jwt-simple');
var clave = 'miSecretoMasOscuro';

var app = express();
app.listen(3000);
//ar datos = require("./datos.js");
app.use("/gestor", express.static("cliente_rest"));      // ← añadir
app.use("/sanitario", express.static("cliente_rpc"));
app.use(express.json());

//Importar el cliente Supabase
const { createClient } = require('@supabase/supabase-js');
//2. configurar con tu URL y public key (anon key)
const supabaseUrl = 'https://qpkbfrjwzanupxzwjtui.supabase.co';
const supabaseKey = 'sb_publishable_IX1FsYJfE6ZyFQEIGRvnLQ_0vufdU82'
const supabase = createClient(supabaseUrl,supabaseKey);

//200 OK
//201 creado OK
//404 elemento que no existe.
//200 array vacío

app.post("/api/gestores/login", async function(req,res){
    var usuario = req.body.usuario;
    var password = req.body.password;
    console.log(usuario,password)
    // Una sola consulta: compruebo que el usuario existe y me traigo id y password
    var { data: info, error } = await supabase.from("gestores").select("id,password").eq("usuario", usuario);
    if(error){
        console.log("Error al realizar SELECT", error);
        res.status(500).json("Error al buscar el usuario");
    }
    else if(info.length > 0){ //longitud del array(dict).
        console.log(info);
        if(info[0].password != password){ //ejemplo consulta varias filas?
            console.log("Contras incorrectas.")
            res.status(403).json("Credenciales inválidas"); //preguntar si así bien.
        }
        else{
            console.log("login correcto")
            var contenido = {
                usuario:info[0].id,
                expira: Date.now() + 60 * 60 * 1000
            }
            var token = jwt.encode(contenido, clave);
            var respuesta = {
                token: token,
                usuario : info[0].id
            }
            res.status(200).json(respuesta);
        }
    }
    else{
        res.status(403).json("No existe el usuario")
    }
})

app.post("/api/gestores", async function (req, res) {
    var gestor = {
        nombre: req.body.nombre,
        apellidos: req.body.apellidos,
        usuario: req.body.usuario,
        password: req.body.password
    };

    var { data: resultado, error } = await supabase.from("gestores").select("id").eq("usuario", gestor.usuario);
    if (error) {
        console.log("Error al comprobar usuario", error);
        res.status(500).json("Error al realizar la consulta");
    } else if (resultado.length > 0) {
        // ya existe un gestor con ese usuario
        res.status(404).json("Usuario no válido");
    } else {
        // no existe, ahora sí insertamos
        var { error: error2 } = await supabase.from("gestores").insert(gestor);
        if (error2) {
            console.log("Error al insertar gestor", error2);
            res.status(500).json("Error al realizar la inserción");
        } else {
            res.status(201).json("Gestor creado");
        }
    }
});

// Antes de este use, los servicios son públicos (no necesitan token)
// Con esta función intermedia validamos el token. Si no es correcto terminamos con un error. Si es correcto continuamos.
app.use("/api", function (req, res, next) {
    var token = req.query.token; // obtengo el token de una query de la URL: http://MI_SERVIDOR/MI_RUTA?token=XXXXXXXX
    console.log(token)
    if (!token) { // no se ha pasado un token
        res.status(301).json("No se ha encontrado token");
        return;
    }

    // Decodificar el token
    try { // capturamos el error por si el token no es correcto
        var contenidoToken = jwt.decode(token, clave); // decodificamos el token para obtener su contenido con la misma clave que se codificó
    } catch (error) {
        res.status(301).json("El token es incorrecto");
        return;
    }
    console.log("El contenido del token es:", contenidoToken);

    // Validar el token
    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) { // validamos el formato del token
        res.status(301).json("El formato del token no es adecuado")
        return;
    }

    // Comprobar la fecha de expiración
    if (contenidoToken.expira < Date.now()) {
        res.status(301).json("El token ha expirado");
        return
    }
    // Todo ha ido bien. con next hago que express continue con el procesado
    next();
});

app.get("/api/ubicaciones", async function(req,res){ //devuelve el array de ubicaciones.
    var { data: ubicaciones, error } = await supabase.from("ubicaciones").select("*");
    if(error){
        console.log("Error al realizar la select", error);
        res.status(500).json("Error al realizar la consulta");
    }else{
        console.log("Ubicaciones: ", ubicaciones)
        res.status(200).json(ubicaciones)
    }
})

app.get("/api/categorias", async function(req,res){ //devuelve el array de categorias.
    var { data: categorias, error } = await supabase.from("categorias").select("*");
    if(error){
        console.log("Error al realizar la select", error);
        res.status(500).json("Error al realizar la consulta");
    }else{
        console.log("Categorias: ",categorias)
        res.status(200).json(categorias)
    }
})

app.get("/api/modelos", async function(req,res){ //devuelve el array de modelos. Estos 3 primeros, están ya definidos, no se van a actualizar.
    var { data: modelos, error } = await supabase.from("modelos").select("*");
    if(error){
        console.log("Error al realizar la select", error);
        res.status(500).json("Error al realizar la consulta");
    }else{
        console.log("Modelos: ",modelos)
        res.status(200).json(modelos)
    }
})

app.get("/api/gestores/:id", async function(req,res){
    var id = req.params.id;
    var { data: gestor, error } = await supabase.from("gestores").select("id,nombre,apellidos,usuario").eq("id", id);
    if(error){
        console.log("Error al realizar la select", error);
        res.status(500).json("Error al realizar la consulta");
    }else{
        if(gestor.length == 0){
            res.status(404).json("No se ha encontrado")
        }else{
            console.log("Gestor:",gestor);
            res.status(200).json(gestor[0]);
        }
    }
})

app.get("/api/sanitarios/:id", async function(req,res){ //no la uso!!
    var id = req.params.id;
    var { data: sanitario, error } = await supabase.from("sanitarios").select("id,nombre,apellidos,usuario").eq("id", id);
    if(error){
        console.log("Error al realizar la select", error);
        res.status(500).json("Error al realizar la consulta");
    }else{
        if(sanitario.length == 0){
            res.status(404).json("No se ha encontrado")
        }else{
            console.log("Sanitario:",sanitario);
            res.status(200).json(sanitario[0]);
        }
    }
})

app.get("/api/recursos/:id", async function(req,res){
    var id = req.params.id; //Originalmente, no devolvía nada de la categoría, pero ahora debo ponerlo??? Diego.
    // no cojo nada de modelos, pero lo uso como puente: modelos(categoria) hace el JOIN. La clave de salida es categoria, no id.
    var { data: recurso, error } = await supabase.from("recursos")
        .select("numero_serie,modelo,ubicacion,estado,modelos(categoria)")
        .eq("id", id);
    if(error){
        console.log("Error al realizar la select", error);
        res.status(500).json("Error al realizar la consulta");
    }else{
        if(recurso.length == 0){
            res.status(404).json("No se ha encontrado")
        }else{
            var r = recurso[0];
            var resultado = {
                numero_serie: r.numero_serie,
                modelo: r.modelo,
                ubicacion: r.ubicacion,
                estado: r.estado,
                categoria: r.modelos.categoria
            };
            console.log("Recurso:",resultado);
            res.status(200).json(resultado);
        }
    }
})

app.get("/api/recursos/:id/reservas", async function(req,res){ //preguntar el añadir el apellido aquí.
    var id =  req.params.id
    var { data: filas, error } = await supabase.from("reservas")
        .select("id,horas_estimadas,fecha_peticion,fecha_inicio,fecha_fin,sanitarios(nombre,apellidos)")
        .eq("recurso", id);
    if(error){
        console.log("Error al realizar la select", error);
        res.status(500).json("Error al realizar la consulta");
    }else{
        if(filas.length == 0){
            res.status(400).json([])
        }else{
            var reservas = filas.map(function(r){
                return {
                    id: r.id,
                    sanitario_nombre: r.sanitarios.nombre,
                    sanitario_apellidos: r.sanitarios.apellidos,
                    horas_estimadas: r.horas_estimadas,
                    fecha_peticion: r.fecha_peticion,
                    fecha_inicio: r.fecha_inicio,
                    fecha_fin: r.fecha_fin
                };
            });
            console.log("Reservas:",reservas);
            res.status(200).json(reservas);
        }
    }
})

app.get("/api/recursos/:id/resenyas", async function(req,res){
    var id =  req.params.id;
    var { data: filas, error } = await supabase.from("resenyas")
        .select("fecha,valor,descripcion,sanitarios(nombre,apellidos)")
        .eq("recurso", id);
    if(error){
        console.log("Error al realizar la select", error);
        res.status(500).json("Error al realizar la consulta");
    }
    else{
        var resenyas = filas.map(function(r){
            return {
                sanitario: r.sanitarios.nombre,
                apellidos: r.sanitarios.apellidos,
                fecha: r.fecha,
                valor: r.valor,
                descripcion: r.descripcion
            };
        });
        console.log("Resenyas:",resenyas);
        res.status(200).json(resenyas);
    }
})
//EL CLIENTE LO CONSTRUYE CON IDS. Y luego pide todo (ubicaciones, modelos y categorias) y búsqueda o que devuelva el servidor todo.:

//si me pide solo el id, lo dejo tal cual sin join porque querrá el id. Pero si sale el nombre y no el id tengo que hacer JOIN (pegamento)

app.get("/api/recursos", async function(req,res){//probarlo y fijarme
    var categoria = req.query.categoria; //el get no tiene body, los valores, vendrán en los query.
    var modelo = req.query.modelo; // ojo, son los values (identificadores)
    var ubicacion = req.query.ubicacion;
    var estado = req.query.estado; //normalmente en los selects está el IDENTIFICADOR.
    // El JOIN lo que hace es combinar filas. modelos!inner hace que el filtro por categoría descarte los recursos que no coinciden.
    // PONEMOS EL ID PQ LO NECESITA PARA LOS BOTONES.
    var consulta = supabase.from("recursos")
        .select("id,numero_serie,estado,modelos!inner(nombre,categoria,categorias(nombre)),ubicaciones(nombre)")
        .order("id");
    // Cada filtro solo se aplica si no es 'Todos'
    if(ubicacion !== undefined && ubicacion != 'Todos') consulta = consulta.eq("ubicacion", ubicacion);
    if(estado !== undefined && estado != 'Todos') consulta = consulta.eq("estado", estado);
    if(modelo !== undefined && modelo != 'Todos') consulta = consulta.eq("modelo", modelo);
    if(categoria !== undefined && categoria != 'Todos') consulta = consulta.eq("modelos.categoria", categoria);

    var { data: filas, error } = await consulta;
    if(error){
        console.log("error en el filtrado",error)
        res.status(500).json("Error al buscar los recursos")
    }else{
        var textoEstado = { 0: 'Operativo', 1: 'De baja/defectuoso', 2: 'Mantenimiento' };
        var recursos = filas.map(function(r){
            return {
                id: r.id,
                numero_serie: r.numero_serie,
                categoria: r.modelos.categorias.nombre,
                modelo: r.modelos.nombre,
                ubicacion: r.ubicaciones.nombre,
                estado: textoEstado[r.estado]
            };
        });
        res.status(200).json(recursos);
    }
})

app.post("/api/recursos", async function(req,res){
    var estado = req.body.estado;
    if(estado != 0 && estado != 1 && estado != 2){
        res.status(400).json("Estado invalido");
    }
    else{
        var { error } = await supabase.from("recursos").insert({
            modelo: parseInt(req.body.modelo),
            ubicacion: parseInt(req.body.ubicacion),
            numero_serie: req.body.numero_serie,
            estado: parseInt(estado)
        });
        if(error){
            console.log("Error al insertar recurso", error);
            res.status(500).json("Error al realizar la inserción");
        }
        else{
            res.status(201).json("Recurso creado");
        }
    }
})

app.delete("/api/recursos/:id", async function(req,res){
    var id_recurso = req.params.id;
    console.log(id_recurso)
    // .select() al final devuelve las filas eliminadas, así sé si existía
    var { data: eliminado, error } = await supabase.from("recursos").delete().eq("id", id_recurso).select();
    if(error){
        console.log("Error al eliminar el recurso", error);
        res.status(500).json("Error al elminar el recurso.");
    }else if(eliminado.length === 0){
        console.log("No hay id")
        res.status(404).json("No se ha encontrado el recurso")
    }else{
        res.status(200).json("Recurso eliminado");
    }
})

app.put("/api/gestores/:id", async function(req,res){
    var id_gestor = req.params.id;
    var { data: respuesta, error: err1 } = await supabase.from("gestores").select("id")
        .eq("usuario", req.body.usuario).neq("id", id_gestor);
    if(err1){
        console.log("Error en la actualización",err1);
        res.status(500).json("Error en la actualizacion del gestor")
    }else{
        if(respuesta.length > 0){
            res.status(404).json("No se ha actualizado la información.");
        }else{
            var { data: actualizacion, error } = await supabase.from("gestores").update({
                nombre: req.body.nombre,
                apellidos: req.body.apellidos,
                usuario: req.body.usuario,
                password: req.body.password
            }).eq("id", id_gestor).select();
            if(error){
                console.log("Error en la actualización",error);
                res.status(500).json("Error en la actualizacion del gestor")
            }else if(actualizacion.length === 0){
                res.status(404).json("No se ha actualizado la información.");
            }else{
                res.status(200).json("Se han actualizado los datos.");
            }
        }
    }
})

app.put("/api/recursos/:id", async function(req,res){
    var id_recurs = req.params.id;//la segunda condición está mal. Preguntar como tienen el resto este original.
    var { data: resultado, error } = await supabase.from("recursos").update({
        numero_serie: req.body.numero_serie,
        modelo: req.body.modelo,
        ubicacion: req.body.ubicacion,
        estado: req.body.estado
    }).eq("id", id_recurs).select();
    if(error){
        console.log("Error en la actualización del recurso",error);
        res.status(500).json("Error en la actualización del recurso")
    }else if (resultado.length === 0) {
        res.status(404).json("No se ha encontrado el recurso");
    }
    else{
        console.log("Recurso actualizado");
        res.status(200).json("El recurso se ha actualizado correctamente.")
    }
})

   
