sap.ui.define(["sap/ui/model/json/JSONModel", "./BaseController"], function(JSONModel, __BaseController) {
    "use strict";

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
    }
    const BaseController = _interopRequireDefault(__BaseController);
    /**
   * @namespace apps.dflc.airlinemasterdetailts
   */
    const App = BaseController.extend("apps.dflc.airlinemasterdetail.App", {
        onInit: function _onInit() {
            const originalBusyDelay = this.getView().getBusyIndicatorDelay();
            const viewModel = new JSONModel({
                busy: true,
                delay: 0,
                layout: "OneColumn",
                previousLayout: "",
                actionButtonsInfo: {
                    midColumn: {
                        fullScreen: false
                    }
                }
            });
            this.setModel(viewModel, "appView");
            const fnSetAppNotBusy = function() {
                viewModel.setProperty("/busy", false);
                viewModel.setProperty("/delay", originalBusyDelay);
            };

            // since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
            const mainModel = this.getUIComponent().getModel();
            mainModel.metadataLoaded().then(fnSetAppNotBusy);
            mainModel.attachMetadataFailed(fnSetAppNotBusy);

            // apply content density mode to root view
            this.getView().addStyleClass(this.getUIComponent().getContentDensityClass());
        }
    });
    return App;
});