const cantidadEntradas = document.querySelector("#cantidad");

const categoria = document.querySelector("#categoria");

const total = document.querySelector("#pagar");

function resumen() {
    const cantidad = parseInt(cantidadEntradas.value);
    const categoriaSeleccionada = categoria.value;
    let descuento = 0;

    if (categoriaSeleccionada === "categoria1") {
        descuento = (cantidad * 200) * 0.8;
    } else if (categoriaSeleccionada === "categoria2") {
        descuento = (cantidad * 200) * 0.5;
    } else if (categoriaSeleccionada === "categoria3") {
        descuento = (cantidad * 200) * 0.15;
    }
    
    const totalPagar = (cantidad * 200) - descuento;
    total.value = "Total a pagar: $" + totalPagar;
};