/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, useState, onWillUnmount, onMounted, useRef } from "@odoo/owl";
import { browser } from "@web/core/browser/browser";
import { useBus } from "@web/core/utils/hooks";

// Tema por defecto: 'nyancat', 'modern' o 'standard'
const DEFAULT_THEME = 'nyancat';

export class CustomLoadingIndicator extends Component {
    setup() {
        this.state = useState({
            count: 0,
            show: false,
            progress: 0,
            message: "Cargando, por favor espere...",
            theme: this.getSavedTheme() || DEFAULT_THEME,
            progressInterval: null,
            menuOpen: false,
            estimatedTime: null,
            startTime: null,
            lastProgress: 0,
            lastUpdateTime: null
        });

        this.rpcIds = new Set();
        this.startShowTimer = null;
        this.nyanCatElement = null;
        this.progressBarElement = null;
        this.dropdownRef = useRef("dropdown");

        // Escuchar eventos RPC
        useBus(this.env.bus, "RPC:REQUEST", this.requestCall.bind(this));
        useBus(this.env.bus, "RPC:RESPONSE", this.responseCall.bind(this));

        // Cerrar menú al hacer clic fuera
        onMounted(() => {
            document.addEventListener('click', this.handleClickOutside);
            this.setupElements();
            this.updateNyanCatPosition(0);
        });

        // Limpiar al desmontar el componente
        onWillUnmount(() => {
            document.removeEventListener('click', this.handleClickOutside);
            this.cleanup();
        });
    }

    // Obtener el tema guardado en localStorage
    getSavedTheme() {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('loadingIndicatorTheme') || DEFAULT_THEME;
        }
        return DEFAULT_THEME;
    }

    // Guardar el tema seleccionado
    saveTheme(theme) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('loadingIndicatorTheme', theme);
        }
    }

    // Manejar clic fuera del menú
    handleClickOutside = (event) => {
        if (this.state.menuOpen && this.dropdownRef.el && 
            !this.dropdownRef.el.contains(event.target) &&
            !event.target.closest('.menu-button')) {
            this.state.menuOpen = false;
        }
    }

    // Alternar visibilidad del menú
    toggleMenu() {
        this.state.menuOpen = !this.state.menuOpen;
    }

    // Cambiar el tema
    changeTheme(theme) {
        this.state.theme = theme;
        this.state.menuOpen = false;
        this.saveTheme(theme);
    }

    // Configurar elementos del DOM
    setupElements() {
        if (typeof document !== 'undefined') {
            this.nyanCatElement = document.querySelector('.o_loading .nyan-cat');
            this.progressBarElement = document.querySelector('.o_loading .progress-bar');
        }
    }

    // Manejar solicitudes RPC
    requestCall({ detail }) {
        if (detail.settings && detail.settings.silent) {
            return;
        }

        // Configurar mensaje basado en la acción si es posible
        let message = "Cargando, por favor espere...";
        if (detail.data && detail.data.params && detail.data.params.model) {
            const modelName = this.getModelName(detail.data.params.model);
            message = `Procesando ${modelName}...`;
        }

        if (this.state.count === 0) {
            this.state.message = message;
            browser.clearTimeout(this.startShowTimer);
            this.startShowTimer = browser.setTimeout(() => {
                if (this.state.count > 0) {
                    this.state.show = true;
                    this.setupElements();
                    this.startProgressSimulation();
                }
            }, 250);
        }

        if (detail.data && detail.data.id) {
            this.rpcIds.add(detail.data.id);
        }
        this.state.count++;
    }

    // Manejar respuestas RPC
    responseCall({ detail }) {
        if (detail.settings && detail.settings.silent) {
            return;
        }

        if (detail.data && detail.data.id) {
            this.rpcIds.delete(detail.data.id);
        }

        this.state.count = Math.max(0, this.state.count - 1);

        if (this.state.count === 0) {
            // Completar la barra de progreso al 100% antes de ocultar
            this.state.progress = 100;
            this.updateNyanCatPosition(100);

            // Esperar un momento para que se vea el 100% y luego ocultar
            browser.setTimeout(() => {
                this.state.show = false;
                // Resetear el progreso después de la animación
                browser.setTimeout(() => {
                    this.state.progress = 0;
                    this.stopProgressSimulation();
                }, 300);
            }, 300);
        } else {
            // Actualizar el progreso basado en las solicitudes restantes
            this.updateProgress();
        }
    }

    // Iniciar simulación de progreso
    startProgressSimulation() {
        // Detener cualquier intervalo existente
        this.stopProgressSimulation();

        // Iniciar la simulación de progreso
        this.state.progress = 0;
        this.state.startTime = new Date().getTime();
        this.state.lastProgress = 0;
        this.state.lastUpdateTime = this.state.startTime;
        this.state.estimatedTime = "Calculando...";
        this.updateNyanCatPosition(0);

        // Iniciar el intervalo para actualizar el progreso
        this.state.progressInterval = browser.setInterval(() => {
            if (this.state.progress < 90) {
                const now = new Date().getTime();
                
                // Actualizar el progreso gradualmente
                this.state.progress = Math.min(90, this.state.progress + (Math.random() * 3));
                
                // Actualizar el tiempo estimado cada 500ms para mayor precisión
                if (now - this.state.lastUpdateTime > 500) {
                    this.updateEstimatedTime();
                    this.state.lastUpdateTime = now;
                    this.state.lastProgress = this.state.progress;
                }
                
                this.updateNyanCatPosition(this.state.progress);
            }
        }, 100);
    }

    // Actualizar el tiempo estimado restante
    updateEstimatedTime() {
        if (this.state.progress <= 0 || this.state.progress >= 95) {
            this.state.estimatedTime = this.state.progress >= 95 ? "Finalizando..." : "Iniciando...";
            return;
        }

        const now = new Date().getTime();
        const elapsedSeconds = (now - this.state.startTime) / 1000;
        
        if (elapsedSeconds > 1 && this.state.progress > 5) {
            // Calcular velocidad de progreso (porcentaje por segundo)
            const progressPerSecond = this.state.progress / elapsedSeconds;
            
            if (progressPerSecond > 0) {
                const remainingProgress = 100 - this.state.progress;
                const estimatedSecondsRemaining = remainingProgress / progressPerSecond;
                
                // Mostrar solo si el tiempo restante es mayor a 1 segundo
                if (estimatedSecondsRemaining >= 1) {
                    const minutes = Math.floor(estimatedSecondsRemaining / 60);
                    const seconds = Math.ceil(estimatedSecondsRemaining % 60);
                    
                    // Asegurarse de que no mostremos 60 segundos cuando debería ser 1 minuto
                    const displaySeconds = seconds === 60 ? 0 : seconds;
                    const displayMinutes = seconds === 60 ? minutes + 1 : minutes;
                    
                    if (displayMinutes > 0) {
                        this.state.estimatedTime = `${displayMinutes}m ${displaySeconds}s`;
                    } else {
                        this.state.estimatedTime = `${displaySeconds}s`;
                    }
                    return;
                }
            }
        }
        
        // Mensaje por defecto si no hay suficiente información
        this.state.estimatedTime = "Un momento...";
    }

    // Detener la simulación de progreso
    stopProgressSimulation() {
        if (this.state.progressInterval) {
            browser.clearInterval(this.state.progressInterval);
            this.state.progressInterval = null;
        }
        this.state.estimatedTime = null;
    }

    // Actualizar el progreso basado en las solicitudes restantes
    updateProgress() {
        if (this.state.count > 0 && this.rpcIds.size > 0) {
            const remaining = (this.rpcIds.size / (this.rpcIds.size + 1)) * 100;
            this.state.progress = Math.min(90, 100 - remaining);
            this.updateNyanCatPosition(this.state.progress);
        }
    }

    // Actualizar la posición del Nyan Cat y el progreso
    updateNyanCatPosition(progress) {
        this.state.progress = progress;
        
        // Actualizar el porcentaje en la barra
        const percentElement = document.querySelector('.progress-percentage, .progress-percent, .progress-text');
        if (percentElement) {
            percentElement.textContent = `${Math.round(progress)}%`;
        }
        
        // Actualizar la posición del Nyan Cat si estamos en el tema nyancat
        if (this.state.theme === 'nyancat') {
            if (!this.nyanCatElement || !this.progressBarElement) {
                this.setupElements();
            }

            if (this.nyanCatElement && this.progressBarElement) {
                const progressBarWidth = this.progressBarElement.offsetWidth;
                const nyanCatWidth = 48; // Ancho fijo del gato Nyancat
                const halfCatWidth = nyanCatWidth / 2;

                // Mostrar siempre el gato
                this.nyanCatElement.style.display = 'block';

                // Calcular la posición basada en el progreso (0-100% del ancho de la barra)
                let position = (progress / 100) * progressBarWidth;
                
                // Si está al 100%, asegurarse de que el gato esté completamente visible
                if (progress >= 100) {
                    position = progressBarWidth - halfCatWidth;
                }
                // Si está al inicio, asegurarse de que el gato no se salga por la izquierda
                else if (progress <= 0) {
                    position = halfCatWidth;
                }
                
                // Aplicar la posición con transición suave
                this.nyanCatElement.style.left = `${position}px`;
            }
        }
        
        // Actualizar la barra de progreso
        if (this.progressBarElement) {
            const progressBar = this.progressBarElement.querySelector('.rainbow-bar, .progress-modern');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }
    }

    // Obtener nombre de modelo legible
    getModelName(model) {
        const modelNames = {
            'sale.order': 'pedido de venta',
            'account.invoice': 'factura',
            'purchase.order': 'orden de compra',
            'stock.picking': 'albarán',
            'hr.employee': 'empleado',
            'product.product': 'producto',
            'res.partner': 'contacto'
        };
        return modelNames[model] || 'datos';
    }

    // Limpiar recursos
    cleanup() {
        document.removeEventListener('click', this.handleClickOutside);
        browser.clearTimeout(this.startShowTimer);
        this.stopProgressSimulation();
    }
}

// Configurar el componente
CustomLoadingIndicator.template = "barra_migrada_prueba.LoadingIndicator";

// Registrar el componente con un nombre único
registry.category("main_components").add("CustomLoadingIndicator", {
    Component: CustomLoadingIndicator,
});
