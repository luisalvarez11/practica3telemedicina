var express = require("express");
var jwt = require('jwt-simple');
var clave = 'miSecretoMasOscuro';
var conexion = require("./conexion_mysql.js")
var app = express();
app.listen(3000);
//ar datos = require("./datos.js");
app.use("/gestor", express.static("cliente_rest"));      // ← añadir
app.use("/sanitario", express.static("cliente_rpc"));
app.use(express.json());

//200 OK
//201 creado OK
//404 elemento que no existe.
//200 array vacío

app.post("/api/gestores/login", function(req,res){
    var usuario = req.body.usuario;
    var password = req.body.password;
    console.log(usuario,password)
    var sql = "SELECT id FROM gestores WHERE gestores.usuario = ?" ; //compruebo que el usuario existe. String = ?
    conexion.query(sql,[usuario],function(err,idusuario){
        if(err){
            console.log("Error al realizar SELECT", err);
            res.status(500).json("Error al buscar el usuario");
        }
        else if(idusuario.length > 0){ //longitud del array(dict).
            var sql2 = "SELECT id,password FROM gestores WHERE gestores.usuario = ?";
            conexion.query(sql2,[usuario],function(err2,info){
                console.log(info);
                if(err2){
                    console.log("Error al realizar SELECT", err);
                    res.status(500).json("Error al buscar password e id");
                }else{
                    if(info[0].password != password){ //ejemplo consulta varias filas?
                    console.log("Contras incorrectas.")
                    res.status(403).json("Credenciales inválidas"); //preguntar si así bien.
                    }
                    else if(info[0].password == password){
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

                    //res.status(200).json(info[0].id) //le envío el id.
                    }
                }
                
            })
        }
        else{
            res.status(403).json("No existe el usuario")
        }
    })
    
})
app.post("/api/gestores", function (req, res) {
    var gestor = {
        nombre: req.body.nombre,
        apellidos: req.body.apellidos,
        usuario: req.body.usuario,
        password: req.body.password
    };

    var sqlComprobar = "SELECT id FROM gestores WHERE usuario = ?";
    conexion.query(sqlComprobar,[gestor.usuario], function (err, resultado) {
        if (err) {
            console.log("Error al comprobar usuario", err);
            res.status(500).json("Error al realizar la consulta");
        } else if (resultado.length > 0) {
            // ya existe un gestor con ese usuario
            res.status(404).json("Usuario no válido");
        } else {
            // no existe, ahora sí insertamos (consulta anidada)
            var sqlInsert = "INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
            conexion.query(sqlInsert, [gestor.nombre, gestor.apellidos, gestor.usuario, gestor.password], function (err2, resultadoInsert) {
                if (err2) {
                    console.log("Error al insertar gestor", err2);
                    res.status(500).json("Error al realizar la inserción");
                } else {
                    res.status(201).json("Gestor creado");
                }
            });
        }
    });
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

app.get("/api/ubicaciones",function(req,ress){ //devuelve el array de ubicaciones.
    var sql = "SELECT * FROM ubicaciones";
    conexion.query(sql,function(err,ubicaciones){
        if(err){
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        }else{
            console.log("Ubicaciones: ", ubicaciones)
            res.status(200).json(ubicaciones)
        }
    })
})

app.get("/api/categorias",function(req,res){ //devuelve el array de categorias.
    var sql = "SELECT * FROM categorias";
    conexion.query(sql,function(err,categorias){
        console.log(categorias)
        if(err){
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        }else{
            console.log("Categorias: ",categorias)
            res.status(200).json(categorias)

        }
    })

})

app.get("/api/modelos",function(req,res){ //devuelve el array de modelos. Estos 3 primeros, están ya definidos, no se van a actualizar.
    var sql = "SELECT * FROM modelos";
    conexion.query(sql,function(err,modelos){
        if(err){
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        }else{
            console.log("Modelos: ",modelos)
            res.status(200).json(modelos)
        }
    })
})

app.get("/api/gestores/:id",function(req,res){
    var id = req.params.id;
    var sql = "SELECT id,nombre,apellidos,usuario FROM gestores WHERE gestores.id = ?" ;
    conexion.query(sql,[id],function(err,gestor){
        if(err){
            console.log("Error al realizar la select", err);
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
})

app.get("/api/sanitarios/:id",function(req,res){ //no la uso!!
    var id = req.params.id;
    var sql = "SELECT id,nombre,apellidos,usuario FROM sanitarios WHERE sanitarios.id = ?";
    conexion.query(sql,[id],function(err,sanitario){
        if(err){
            console.log("Error al realizar la select", err);
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
})

app.get("/api/recursos/:id",function(req,res){
    var id = req.params.id; //Originalmente, no devolvía nada de la categoría, pero ahora debo ponerlo??? Diego.
    //no cojo nada de modelos, pero lo uso como puente para el pegamento. PONGO AS PARA QUE LA CLAVE SEA CATEGORIA no id.
    var sql = "SELECT r.numero_serie,r.modelo,r.ubicacion,r.estado,c.id AS categoria FROM recursos r JOIN modelos m ON m.id = r.modelo JOIN categorias c ON c.id = m.categoria WHERE r.id = ?";
    conexion.query(sql,[id],function(err,recurso){
        if(err){
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        }else{
            if(recurso.length == 0){
                res.status(404).json("No se ha encontrado")
            }else{
                console.log("Recurso:",recurso);
                res.status(200).json(recurso[0]);
            }
        
        }
    })
})

app.get("/api/recursos/:id/reservas",function(req,res){ //preguntar el añadir el apellido aquí.
    var id =  req.params.id
    sql = "SELECT r.id,s.nombre AS sanitario_nombre,s.apellidos as sanitario_apellidos,r.horas_estimadas,r.fecha_peticion,r.fecha_inicio,r.fecha_fin FROM reservas r JOIN sanitarios s ON s.id = r.sanitario WHERE r.recurso = ?"; //poner join.
    conexion.query(sql,[id],function(err,reservas){
        console.log(reservas)
        if(err){
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        }else{
            if(reservas.length == 0){
                res.status(400).json([])
            }else{
                console.log("Reservas:",reservas);
                res.status(200).json(reservas);
            }
        
        }
    })
})

app.get("/api/recursos/:id/resenyas",function(req,res){
    var id =  req.params.id;
    sql = "SELECT s.nombre AS sanitario,s.apellidos,r.fecha,r.valor,r.descripcion FROM resenyas r JOIN sanitarios s ON r.sanitario = s.id WHERE r.recurso = ?"
    conexion.query(sql,[id],function(err,resenyas){
        if(err){
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        }
        else{
            console.log("Resenyas:",resenyas);
            res.status(200).json(resenyas);
        }
    })
})
//EL CLIENTE LO CONSTRUYE CON IDS. Y luego pide todo (ubicaciones, modelos y categorias) y búsqueda o que devuelva el servidor todo.:
/*
app.get("/api/recursos",function(req,res){
    var categoria = req.query.categoria; //el get no tiene body, los valores, vendrán en los query.
    var modelo = req.query.modelo; // ojo, son los values (identificadores)
    var ubicacion = req.query.ubicacion;
    var estado = req.query.estado;
    var sql = "SELECT r.numero_serie,r.modelo,c.id,r.estado FROM recursos r "+ "JOIN modelos m ON m.id = r.modelo"
    +"JOIN categorias c ON c.id = m.categoria" + "WHERE (r.ubicacion = ? OR ? = 'Todos') AND (r.estado = ? OR ? = 'Todos') AND (r.modelo = ? OR ? = 'Todos')"
    +" AND (m.categoria = ? OR ? = 'Todos')"
    conexion.query(sql,[ubicacion,ubicacion,estado,estado,modelo,modelo,categoria,categoria],function(err,resultado){
        if(err){
            console.log("error en el filtrado",err)
            res.status(500).json("Error al buscar los recursos")
        }else{
            res.status(200).json(recursos);
        }
    }) //normalmente en los selects está el IDENTIFICADOR.
})
    */
//si me pide solo el id, lo dejo tal cual sin join porque querrá el id. Pero si sale el nombre y no el id tengo que hacer JOIN (pegamento)

app.get("/api/recursos",function(req,res){//probarlo y fijarme
    var categoria = req.query.categoria; //el get no tiene body, los valores, vendrán en los query.
    var modelo = req.query.modelo; // ojo, son los values (identificadores)
    var ubicacion = req.query.ubicacion;
    var estado = req.query.estado; //normalmente en los selects está el IDENTIFICADOR.
    // El JOIN lo que hace es combinar filas.
    // El enganche va secuencial PONEMOS EL ID PQ LO NECESITA PARA LOS BOTONES.                   //1
    var sql = "SELECT r.id,r.numero_serie,c.nombre AS categoria ,m.nombre AS modelo,u.nombre AS ubicacion," +                                     //para que el resultado siga siendo estado.
    "CASE r.estado WHEN 0 THEN 'Operativo' WHEN 1 THEN 'De baja/defectuoso' WHEN 2 THEN 'Mantenimiento' END AS estado "+
    "FROM recursos r JOIN modelos m ON m.id = r.modelo " + "JOIN ubicaciones u ON u.id = r.ubicacion " + "JOIN categorias c ON m.categoria = c.id "+  //al usar m otra vez coge de la fila ya enganchada.
    "WHERE (r.ubicacion = ? OR ? = 'Todos') AND (r.estado = ? OR ? = 'Todos') AND (r.modelo = ? OR ? = 'Todos')" //hasta aqui es como que muestra la info de todos los recuros, pero yo quiero filtrarlo WHERE
    +" AND (m.categoria = ? OR ? = 'Todos')";
    conexion.query(sql,[ubicacion,ubicacion,estado,estado,modelo,modelo,categoria,categoria],function(err,recursos){
        if(err){
            console.log("error en el filtrado",err)
            res.status(500).json("Error al buscar los recursos")
        }else{
            res.status(200).json(recursos);
        }
    })
})




app.post("/api/recursos", function(req,res){
    var estado = req.body.estado;
    if(estado != 0 && estado != 1 && estado != 2){
        res.status(400).json("Estado invalido");
    }
    else{
        var sql = "INSERT INTO recursos (modelo,ubicacion,numero_serie,estado) VALUES (?,?,?,?)";
        conexion.query(sql,[parseInt(req.body.modelo),parseInt(req.body.ubicacion),req.body.numero_serie,parseInt(estado)],function(err,resultadoInsert){
            if(err){
                console.log("Error al insertar recurso", err);
                res.status(500).json("Error al realizar la inserción");
            }
            else{
                res.status(201).json("Recurso creado");
            }
        })
        
    }
})

app.delete("/api/recursos/:id",function(req,res){
    var id_recurso = req.params.id;
    console.log(id_recurso)
    var sql = "DELETE FROM recursos WHERE recursos.id = ? ";
    conexion.query(sql,[id_recurso],function(err,eliminado){
        if(err){
            console.log("Error al eliminar el recurso", err);
            res.status(500).json("Error al elminar el recurso.");
        }else if(eliminado.affectedRows === 0){
            console.log("No hay id")
            res.status(404).json("No se ha encontrado el recurso")
        }else{
            res.status(200).json("Recurso eliminado");
        }
    })
})
app.put("/api/gestores/:id",function(req,res){
    var id_gestor = req.params.id;
    var sql1 = "SELECT id FROM gestores WHERE usuario = ? AND id != ? "
    conexion.query(sql1,[req.body.usuario,id_gestor],function(err1,respuesta){
        if(err1){
            console.log("Error en la actualización",err1);
            res.status(500).json("Error en la actualizacion del gestor")
        }else{
            if(respuesta.length > 0){
                res.status(404).json("No se ha actualizado la información.");
            }else{
                var sql = "UPDATE gestores SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?"
                conexion.query(sql,[req.body.nombre, req.body.apellidos, req.body.usuario, req.body.password, id_gestor],function(err,actualizacion){
                    if(err){
                        console.log("Error en la actualización",err);
                        res.status(500).json("Error en la actualizacion del gestor")
                    }else if(actualizacion.affectedRows === 0){
                        res.status(404).json("No se ha actualizado la información.");
                    }else{
                        res.status(200).json("Se han actualizado los datos.");
                    }
        })

            }
        }
    })
    
})


app.put("/api/recursos/:id", function(req,res){
    var id_recurs = req.params.id;//la segunda condición está mal. Preguntar como tienen el resto este original.
    var sql = "UPDATE recursos SET numero_serie = ?, modelo = ?, ubicacion = ?, estado = ? WHERE recursos.id = ? "
    var num_serie_int = req.body.numero_serie;
    conexion.query(sql,[num_serie_int,req.body.modelo,req.body.ubicacion,req.body.estado,id_recurs],function(err,resultado){
        if(err){
            
            console.log("Error en la actualización del recurso",err);
            res.status(500).json("Error en la actualización del recurso")
        }else if (resultado.affectedRows === 0) {
            res.status(404).json("No se ha encontrado el recurso");
        }
        else{
            console.log("Recurso actualizado");
            res.status(200).json("El recurso se ha actualizado correctamente.")
        }
    })

})

