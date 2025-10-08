sap.ui.define(["./BaseController", "sap/m/MessageBox", "sap/m/MessageToast"], function(__BaseController, MessageBox, MessageToast) {
    "use strict";

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
    }
    const BaseController = _interopRequireDefault(__BaseController);
    /**
   * @namespace apps.dflc.airlinemasterdetailts
   */
    const FlightDetail = BaseController.extend("FlightDetail", {
        onInit: function _onInit() {
            this.getRouter().getRoute("flightDetail").attachMatched(this._onRouteMatched, this);
        },
        /**
     * Binds the view to the object path and expands the aggregated line items.
     * @function
     * @param event pattern match event in route 'flightDetail'
     * @private
     */
        _onRouteMatched: function _onRouteMatched(event) {
            const AirlineID = event.getParameter("arguments").AirlineID;
            const ConnectionID = event.getParameter("arguments").ConnectionID;
            const oView = this.getView();
            if (!oView) {
                console.error("View not found");
                return;
            }
            const oEditModel = oView.getModel("editFlightModel");
            if (!oEditModel) {
                console.error("Edit company model not found");
                return;
            }
            if (ConnectionID !== "New") {
                oEditModel.setProperty("/isNew", false);
                this.getModel().metadataLoaded().then(function() {
                    const objectPath = this.getModel().createKey("FlightPlanSet", {
                        AirlineID: AirlineID,
                        ConnectionID: ConnectionID
                    });
                    oView.bindElement({
                        path: "/" + objectPath,
                        events: {
                            change: this._onBindingChange.bind(this),
                            dataRequested: function(oEvent) {
                                oView.setBusy(true);
                            },
                            dataReceived: function(oEvent) {
                                oView.setBusy(false);
                            }
                        }
                    });
                }
                .bind(this));
            } else {
                this._initNewFlight(AirlineID);
            }
        },
        _initNewFlight: function _initNewFlight(AirlineID) {
            const oView = this.getView();
            if (!oView) {
                console.error("View not found");
                return;
            }
            const oEditModel = oView.getModel("editFlightModel");
            if (!oEditModel) {
                console.error("Edit company model not found");
                return;
            }
            oEditModel.setProperty("/isNew", true);
            var oModel = oView.getModel();
            if (oModel) {
                oModel.setDeferredGroups(["createFlightId"]);
                oModel.setChangeGroups({
                    SpfliSet: {
                        groupId: "createFlightId",
                        changeSetId: "ID"
                    }
                });
                var oContext = oModel.createEntry("/FlightPlanSet", {
                    groupId: "createFlightId",
                    properties: {
                        AirlineID: AirlineID
                    }
                });
                oView.bindElement(oContext.getPath());
            }
        },
        _onBindingChange: function _onBindingChange() {
            const view = this.getView();
            const elementBinding = view.getElementBinding();

            // No data for the binding
            if (!elementBinding?.getBoundContext()) {
                this.getRouter().getTargets().display("notFound");
                return;
            }
        },
        onBtnSavePress: function _onBtnSavePress(oEvent) {
            const oModel = this.getView()?.getModel();
            oModel.submitChanges({
                success: this._onSaveSuccess.bind(this),
                error: this._onSaveError.bind(this)
            });
        },
        onBtnDeletePress: function _onBtnDeletePress(oEvent) {
            const oModel = this.getView()?.getModel();
            const oElementBinding = this.getView()?.getElementBinding();
            const oContext = oElementBinding?.getBoundContext();
            const oThat = this;
            if (!oContext) {
                MessageBox.alert("No context available for saving");
                return;
            }
            MessageBox.warning(this.getResourceBundle().getText("deleteInformation"), {
                actions: ["OK", "CANCEL"],
                onClose: function(sAction) {
                    if (sAction == "OK") {
                        oModel.remove(oContext.getPath(), {
                            success: oThat._onDeleteSuccess.bind(oThat),
                            error: oThat._onDeleteError.bind(oThat)
                        });
                    }
                }
            });
        },
        _onSaveSuccess: function _onSaveSuccess(oRes, oData) {
            const oModel = this.getView()?.getModel();

            // Check batch response for errors
            if (oRes.__batchResponses) {
                if (oRes.__batchResponses[0].response) {
                    const status = parseInt(oRes.__batchResponses[0].response.statusCode);
                    if (status >= 400) {
                        const oResponseBody = JSON.parse(oRes.__batchResponses[0].response.body);
                        MessageBox.alert("Error when saving. ERROR:" + oResponseBody.error.message.value);
                        oModel.resetChanges();
                        oModel.refresh();
                    } else {
                        MessageToast.show("Saved successfully!");
                        this.onNavBack();
                    }
                } else if (oRes.__batchResponses[0].__changeResponses) {
                    const aChangeRes = oRes.__batchResponses[0].__changeResponses;
                    const status = parseInt(aChangeRes[0].statusCode);
                    if (status >= 400) {
                        MessageBox.alert("Error when saving");
                        oModel.resetChanges();
                        oModel.refresh();
                    } else {
                        MessageToast.show("Saved successfully!");
                        this.onNavBack();
                    }
                }
            } else {
                MessageToast.show("Saved successfully!");
                this.onNavBack();
            }
        },
        /**
     * Handle save operation errors
     */
        _onSaveError: function _onSaveError(oError) {
            if (oError) {
                if (oError.responseText) {
                    const oErrorMessage = JSON.parse(oError.responseText);
                    MessageBox.alert(oErrorMessage.error.message.value);
                }
            }
        },
        _onDeleteSuccess: function _onDeleteSuccess(oRes) {
            MessageToast.show("Campany was deleted");
            this.onNavBack();
        },
        _onDeleteError: function _onDeleteError(oError) {
            if (oError) {
                if (oError.responseText) {
                    var oErrorMessage = JSON.parse(oError.responseText);
                    MessageBox.alert(oErrorMessage.error.message.value);
                }
            }
        }
    });
    return FlightDetail;
});