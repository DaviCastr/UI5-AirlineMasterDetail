sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/routing/History", "../model/formatter"], function(Controller, History, ___model_formatter) {
    "use strict";

    const currencyValue = ___model_formatter["currencyValue"];
    /**
   * @namespace apps.dflc.airlinemasterdetailts
   */
    const BaseController = Controller.extend("apps.dflc.airlinemasterdetail.BaseController", {
        constructor: function constructor() {
            Controller.prototype.constructor.apply(this, arguments);
            this.formatter = {
                currencyValue
            };
        },
        /**
     * Convenience method for accessing the owner component.
     *
     * @returns the owner component
     */
        getUIComponent: function _getUIComponent() {
            return Controller.prototype.getOwnerComponent.call(this);
        },
        /**
     * Convenience method for accessing the router in every controller of the application.
     *
     * @returns the router for this component
     */
        getRouter: function _getRouter() {
            return this.getUIComponent().getRouter();
        },
        /**
     * Convenience method for getting the view model by name in every controller of the application.
     *
     * @param name the model name
     * @returns the model instance
     */
        getModel: function _getModel(name) {
            return this.getView().getModel(name);
        },
        /**
     * Convenience method for setting the view model in every controller of the application.
     *
     * @param model the model instance
     * @param name the model name
     * @returns the view instance
     */
        setModel: function _setModel(model, name) {
            return this.getView().setModel(model, name);
        },
        /**
     * Convenience method for getting the resource bundle.
     *
     * @returns the resourceBundle of the component
     */
        getResourceBundle: function _getResourceBundle() {
            return this.getUIComponent().getModel("i18n").getResourceBundle();
        },
        /**
     * Event handler for navigating back.
     * It there is a history entry we go one step back in the browser history
     * If not, it will replace the current entry of the browser history with the list route.
     * 
     */
        onNavBack: function _onNavBack() {
            if (History.getInstance().getPreviousHash() !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("list", {});
            }
        }
    });
    return BaseController;
});