sap.ui.define(["sap/m/library", "sap/ui/model/json/JSONModel", "./BaseController", "sap/m/Dialog", "sap/m/MessageBox", "sap/m/MessageToast", "sap/ui/core/Fragment"], function(sap_m_library, JSONModel, __BaseController, Dialog, MessageBox, MessageToast, Fragment) {
    "use strict";

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
    }
    const URLHelper = sap_m_library["URLHelper"];
    const BaseController = _interopRequireDefault(__BaseController);
    /**
   * @namespace apps.dflc.airlinemasterdetailts
   */
    //Additional interfaces
    const Detail = BaseController.extend("Detail", {
        onInit: function _onInit() {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            const viewModel = new JSONModel({
                busy: false,
                delay: 0,
                lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
            });
            this.getRouter().getRoute("object").attachPatternMatched(this.onObjectMatched, this);
            this.setModel(viewModel, "detailView");
            this.getOwnerComponent().getModel().metadataLoaded().then(this.onMetadataLoaded.bind(this));
        },
        /**
     * Event handler when the share by E-Mail button has been clicked
     */
        onSendEmailPress: function _onSendEmailPress() {
            const viewModel = this.getModel("detailView");
            URLHelper.triggerEmail(undefined, viewModel.getProperty("/shareSendEmailSubject"), viewModel.getProperty("/shareSendEmailMessage"));
        },
        /**
     * Updates the item count within the line item table's header
     * @param event an event containing the total number of items in the list
     */
        onListUpdateFinished: function _onListUpdateFinished(event) {
            const viewModel = this.getModel("detailView");
            const totalItems = event.getParameter("total");
            let title;
            // only update the counter if the length is final
            if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
                if (totalItems) {
                    title = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [totalItems]);
                } else {
                    //Display 'Line Items' instead of 'Line items (0)'
                    title = this.getResourceBundle().getText("detailLineItemTableHeading");
                }
                viewModel.setProperty("/lineItemListTitle", title);
            }
        },
        /**
     * Binds the view to the object path and expands the aggregated line items.
     * @function
     * @param event pattern match event in route 'object'
     * @private
     */
        onObjectMatched: function _onObjectMatched(event) {
            const AirlineID = event.getParameter("arguments").AirlineID;
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getModel().metadataLoaded().then(function() {
                const objectPath = this.getModel().createKey("AirlineSet", {
                    AirlineID: AirlineID
                });
                this.bindView("/" + objectPath);
            }
            .bind(this));
        },
        /**
     * Binds the view to the object path. Makes sure that detail view displays
     * a busy indicator while data for the corresponding element binding is loaded.
     * @function
     * @param objectPath path to the object to be bound to the view.
     */
        bindView: function _bindView(objectPath) {
            // Set busy indicator during view binding
            const viewModel = this.getModel("detailView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            viewModel.setProperty("/busy", false);
            this.getView().bindElement({
                path: objectPath,
                events: {
                    change: this.onBindingChange.bind(this),
                    dataRequested: function() {
                        viewModel.setProperty("/busy", true);
                    },
                    dataReceived: function() {
                        viewModel.setProperty("/busy", false);
                    }
                }
            });
        },
        onBindingChange: function _onBindingChange() {
            const view = this.getView();
            const elementBinding = view.getElementBinding();

            // No data for the binding
            if (!elementBinding?.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearListSelection();
                return;
            }
            const path = elementBinding.getPath();
            const resourceBundle = this.getResourceBundle();
            const detailObject = this.getModel().getObject(path);
            const viewModel = this.getModel("detailView");
            this.getOwnerComponent().oListSelector.selectAListItem(path);
            viewModel.setProperty("/shareSendEmailSubject", resourceBundle.getText("shareSendEmailObjectSubject", [detailObject.AirlineID]));
            viewModel.setProperty("/shareSendEmailMessage", resourceBundle.getText("shareSendEmailObjectMessage", [detailObject.AirlineName, detailObject.AirlineID, location.href]));
        },
        onMetadataLoaded: function _onMetadataLoaded() {
            // Store original busy indicator delay for the detail view
            const originalViewBusyDelay = this.getView().getBusyIndicatorDelay();
            const viewModel = this.getModel("detailView");
            const lineItemTable = this.byId("lineItemsList");
            const originalLineItemTableBusyDelay = lineItemTable.getBusyIndicatorDelay();

            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            viewModel.setProperty("/delay", 0);
            viewModel.setProperty("/lineItemTableDelay", 0);
            lineItemTable.attachEventOnce("updateFinished", function() {
                // Restore original busy indicator delay for line item table
                viewModel.setProperty("/lineItemTableDelay", originalLineItemTableBusyDelay);
            });

            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            viewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            viewModel.setProperty("/delay", originalViewBusyDelay);
        },
        /**
     * Set the full screen mode to false and navigate to list page
     */
        onCloseDetailPress: function _onCloseDetailPress() {
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            // No item should be selected on list after detail page is closed
            this.getOwnerComponent().oListSelector.clearListSelection();
            this.getRouter().navTo("list");
        },
        /**
     * Toggle between full and non full screen mode.
     */
        toggleFullScreen: function _toggleFullScreen() {
            const viewModel = this.getModel("appView");
            const fullScreen = viewModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
            viewModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", !fullScreen);
            if (!fullScreen) {
                // store current layout and go full screen
                viewModel.setProperty("/previousLayout", viewModel.getProperty("/layout"));
                viewModel.setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                viewModel.setProperty("/layout", viewModel.getProperty("/previousLayout"));
            }
        },
        //Additional methods
        onEditCompanyBtnPress: function _onEditCompanyBtnPress(oEvent) {
            const oView = this.getView();
            if (!oView) {
                console.error("View not found");
                return;
            }
            const oEditModel = oView.getModel("editCompanyModel");
            if (!oEditModel) {
                console.error("Edit company model not found");
                return;
            }
            oEditModel.setProperty("/isNew", false);
            if (!this.oDialogEditCompany) {
                Fragment.load({
                    id: this.getView()?.getId(),
                    name: "apps.dflc.airlinemasterdetail.view.EditCompanyDialog",
                    controller: this
                }).then(oDialog => {
                    // Verificar se é um Dialog válido
                    if (!oDialog) {
                        console.error("Dialog not loaded");
                        return;
                    }
                    const oDialogControl = Array.isArray(oDialog) ? oDialog[0] : oDialog;
                    if (!(oDialogControl instanceof Dialog)) {
                        console.error("Loaded fragment is not a Dialog");
                        return;
                    }
                    const oEditDialog = oDialogControl;

                    // connect dialog to the root view of this component (models, lifecycle)
                    this.getView()?.addDependent(oEditDialog);

                    // Adicionar content density class
                    const sDensityClass = this._getContentDensityClass();
                    if (sDensityClass) {
                        oEditDialog.addStyleClass(sDensityClass);
                    }
                    this.oDialogEditCompany = oEditDialog;
                    this.oDialogEditCompany.open();
                }
                ).catch(oError => {
                    console.error("Error loading dialog fragment:", oError);
                }
                );
            } else {
                this.oDialogEditCompany.open();
            }
        },
        onSaveCompanyButtonPress: function _onSaveCompanyButtonPress(oEvent) {
            const oModel = this.getView()?.getModel();
            if (this.oDialogEditCompany) {
                this.oDialogEditCompany.setBusy(true);
            }
            oModel.submitChanges({
                success: this._onSaveSuccess.bind(this),
                error: this._onSaveError.bind(this)
            });
        },
        onCancelNewCompany: function _onCancelNewCompany(oEvent) {
            const oModel = this.getView()?.getModel();
            oModel.resetChanges();
            if (this.oDialogEditCompany) {
                this.oDialogEditCompany.close();
            }
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
                        if (oThat.oDialogEditCompany) {
                            oThat.oDialogEditCompany.setBusy(true);
                        }
                        oModel.remove(oContext.getPath(), {
                            success: oThat._onDeleteSuccess.bind(oThat),
                            error: oThat._onDeleteError.bind(oThat)
                        });
                    }
                }
            });
        },
        onListItemPressed: function _onListItemPressed(oEvent) {
            try {
                const oItem = oEvent.getSource();
                const oCtx = oItem.getBindingContext();
                if (!oCtx) {
                    console.error("Binding context not found for list item");
                    return;
                }
                const AirlineID = oCtx.getProperty("AirlineID");
                const ConnectionID = oCtx.getProperty("ConnectionID");
                if (!AirlineID || !ConnectionID) {
                    console.error("Carrid or Connid property not found");
                    return;
                }
                const oRouter = this.getRouter();
                oRouter.navTo("flightDetail", {
                    AirlineID: AirlineID,
                    ConnectionID: ConnectionID
                });
            } catch (error) {
                console.error("Error in onListItemPressed:", error);
            }
        },
        onBtnCreatePress: function _onBtnCreatePress(oEvent) {
            try {
                const oView = this.getView();
                const oCtx = oView.getBindingContext();
                if (!oCtx) {
                    console.error("Binding context not found for view");
                    return;
                }
                const AirlineID = oCtx.getProperty("AirlineID");
                if (!AirlineID) {
                    console.error("Carrid property not found");
                    return;
                }
                const oRouter = this.getRouter();
                oRouter.navTo("flightDetail", {
                    AirlineID: AirlineID,
                    ConnectionID: "New"
                });
            } catch (error) {
                console.error("Error in onBtnCreatePress:", error);
            }
        },
        /**
     * Helper method to get content density class
     */
        _getContentDensityClass: function _getContentDensityClass() {
            try {
                const oOwnerComponent = this.getOwnerComponent();
                if (oOwnerComponent?.getContentDensityClass) {
                    return oOwnerComponent.getContentDensityClass();
                }
            } catch (error) {
                console.warn("Could not get content density class:", error);
            }
            return "";
        },
        _onSaveSuccess: function _onSaveSuccess(oRes, oData) {
            const oModel = this.getView()?.getModel();

            // Show busy indicator
            if (this.oDialogEditCompany) {
                this.oDialogEditCompany.setBusy(false);
            }

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
                        this.oDialogEditCompany?.close();
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
                        this.oDialogEditCompany?.close();
                    }
                }
            } else {
                MessageToast.show("Saved successfully!");
                this.oDialogEditCompany?.close();
            }
        },
        /**
     * Handle save operation errors
     */
        _onSaveError: function _onSaveError(oError) {
            if (this.oDialogEditCompany) {
                this.oDialogEditCompany.setBusy(false);
            }
            if (oError) {
                if (oError.responseText) {
                    const oErrorMessage = JSON.parse(oError.responseText);
                    MessageBox.alert(oErrorMessage.error.message.value);
                }
            }
        },
        _onDeleteSuccess: function _onDeleteSuccess(oRes) {
            if (this.oDialogEditCompany) {
                this.oDialogEditCompany.setBusy(false);
            }
            MessageToast.show("Campany was deleted");
            this.oDialogEditCompany?.close();
            this.onNavBack();
        },
        _onDeleteError: function _onDeleteError(oError) {
            if (this.oDialogEditCompany) {
                this.oDialogEditCompany.setBusy(false);
            }
            if (oError) {
                if (oError.responseText) {
                    var oErrorMessage = JSON.parse(oError.responseText);
                    MessageBox.alert(oErrorMessage.error.message.value);
                }
            }
        }
    });
    return Detail;
});