sap.ui.define(["sap/m/GroupHeaderListItem", "sap/m/Button", "sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/Sorter", "sap/ui/model/FilterOperator", "sap/ui/Device", "sap/ui/core/Fragment", "./BaseController", "sap/m/Dialog", "sap/m/MessageBox", "sap/m/MessageToast"], function(GroupHeaderListItem, Button, JSONModel, Filter, Sorter, FilterOperator, sap_ui_Device, Fragment, __BaseController, Dialog, MessageBox, MessageToast) {
    "use strict";

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
    }
    const system = sap_ui_Device["system"];
    const BaseController = _interopRequireDefault(__BaseController);
    /**
   * @namespace apps.dflc.airlinemasterdetailts
   */
    //Additional interfaces
    const List = BaseController.extend("List", {
        constructor: function constructor() {
            BaseController.prototype.constructor.apply(this, arguments);
            this.listFilterState = {
                aFilter: [],
                aSearch: []
            };
        },
        /**
     * Called when the list controller is instantiated. It sets up the event handling for the list/detail communication and other lifecycle tasks.
     */
        onInit: function _onInit() {
            // Control state model
            this.list = this.byId("list");
            const viewModel = this.createViewModel();
            // Put down list's original value for busy indicator delay,
            // so it can be restored later on. Busy handling on the list is
            // taken care of by the list itself.
            const iOriginalBusyDelay = this.list.getBusyIndicatorDelay();
            this.setModel(viewModel, "listView");
            // Make sure, busy indication is showing immediately so there is no
            // break after the busy indication for loading the view's meta data is
            // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
            this.list.attachEventOnce("updateFinished", function() {
                // Restore original busy indicator delay for the list
                viewModel.setProperty("/delay", iOriginalBusyDelay);
            });
            this.getView().addEventDelegate({
                onBeforeFirstShow: function() {
                    this.getUIComponent().oListSelector.setBoundList(this.list);
                }
                .bind(this)
            });
            this.getRouter().getRoute("list").attachPatternMatched(this.onListMatched, this);
            this.getRouter().attachBypassed(this.onBypassed, this);
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */
        /**
     * After list data is available, this handler method updates the
     * list counter
     * @param event the update finished event
     */
        onUpdateFinished: function _onUpdateFinished(event) {
            // update the list object counter after new data is loaded
            this.updateListItemCount(event.getParameter("total"));
        },
        /**
     * Event handler for the list search field. Applies current
     * filter value and triggers a new search. If the search field's
     * 'refresh' button has been pressed, no new search is triggered
     * and the list binding is refresh instead.
     *
     * @param event the search event
     */
        onSearch: function _onSearch(event) {
            if (event.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
                return;
            }
            const query = event.getParameter("query");
            if (query) {
                this.listFilterState.aSearch = [new Filter("AirlineName",FilterOperator.Contains,query)];
            } else {
                this.listFilterState.aSearch = [];
            }
            this.applyFilterSearch();
        },
        /**
     * Event handler for refresh event. Keeps filter, sort
     * and group settings and refreshes the list binding.
     */
        onRefresh: function _onRefresh() {
            this.list.getBinding("items")?.refresh(false);
        },
        /**
     * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
     * @param event the button press event
     */
        onOpenViewSettings: function _onOpenViewSettings(event) {
            let dialogTab = "filter";
            if (event.getSource()instanceof Button) {
                const buttonId = event.getSource().getId();
                if (buttonId.match("sort")) {
                    dialogTab = "sort";
                } else if (buttonId.match("group")) {
                    dialogTab = "group";
                }
            }
            // load asynchronous XML fragment
            let dialog = this.byId("viewSettingsDialog");
            if (!this.byId("viewSettingsDialog")) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "apps.dflc.airlinemasterdetail.view.ViewSettingsDialog",
                    controller: this
                }).then(function(ctrl) {
                    // connect dialog to the root view of this component (models, lifecycle)
                    dialog = Array.isArray(ctrl) ? ctrl[0] : ctrl;
                    this.getView().addDependent(dialog);
                    dialog.addStyleClass(this.getUIComponent().getContentDensityClass());
                    dialog.open(dialogTab);
                }
                .bind(this));
            } else {
                dialog.open(dialogTab);
            }
        },
        /**
     * Event handler called when ViewSettingsDialog has been confirmed, i.e.
     * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
     * are applied to the list, which can also mean that they
     * are removed from the list, in case they are
     * removed in the ViewSettingsDialog.
     * @param event the confirm event
     */
        onConfirmViewSettingsDialog: function _onConfirmViewSettingsDialog(event) {
            this.applySortGroup(event);
        },
        /**
     * Apply the chosen sorter and grouper to the list
     * @param event the confirm event
     */
        applySortGroup: function _applySortGroup(event) {
            const params = event.getParameters();
            const sorters = [];
            sorters.push(new Sorter(params.sortItem.getKey(),params.sortDescending));
            this.list.getBinding("items").sort(sorters);
        },
        /**
     * Event handler for the list selection event.
     *
     * @param event the list selectionChange event
     */
        onSelectionChange: function _onSelectionChange(event) {
            const list = event.getSource();
            const selected = event.getParameter("selected");

            // skip navigation when deselecting an item in multi selection mode
            if (!(list.getMode() === "MultiSelect" && !selected)) {
                // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
                this.showDetail(event.getParameter("listItem") || event.getSource());
            }
        },
        /**
     * Event handler for the bypassed event, which is fired when no routing pattern matched.
     * If there was an object selected in the list, that selection is removed.
     *
     */
        onBypassed: function _onBypassed() {
            this.list.removeSelections(true);
        },
        /**
     * Used to create GroupHeaders with non-capitalized caption.
     * These headers are inserted into the list to
     * group the list's items.
     * @param group group whose text is to be displayed
     *
     * @returns group header with non-capitalized caption.
     */
        createGroupHeader: function _createGroupHeader(group) {
            return new GroupHeaderListItem({
                title: group.text,
                upperCase: false
            });
        },
        createViewModel: function _createViewModel() {
            return new JSONModel({
                isFilterBarVisible: false,
                filterBarLabel: "",
                delay: 0,
                title: this.getResourceBundle().getText("listTitleCount", [0]),
                noDataText: this.getResourceBundle().getText("listListNoDataText"),
                sortBy: "AirlineName",
                groupBy: "None"
            });
        },
        onListMatched: function _onListMatched() {
            //Set the layout property of the FCL control to 'OneColumn'
            this.getModel("appView").setProperty("/layout", "OneColumn");
        },
        /**
     * Shows the selected item on the detail page
     * On phones a additional history entry is created
     * @param item selected Item
     *
     */
        showDetail: function _showDetail(item) {
            // set the layout property of FCL control to show two columns
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getRouter().navTo("object", {
                AirlineID: item.getBindingContext().getProperty("AirlineID")
            }, undefined, !system.phone);
        },
        /**
     * Sets the item count on the list header
     * @param total the total number of items in the list
     *
     */
        updateListItemCount: function _updateListItemCount(total) {
            // only update the counter if the length is final
            if (this.list.getBinding("items").isLengthFinal()) {
                const title = this.getResourceBundle().getText("listTitleCount", [total]);
                this.getModel("listView").setProperty("/title", title);
            }
        },
        /**
     * Internal helper method to apply both filter and search state together on the list binding
     */
        applyFilterSearch: function _applyFilterSearch() {
            const filters = this.listFilterState.aSearch.concat(this.listFilterState.aFilter);
            const viewModel = this.getModel("listView");
            this.list.getBinding("items").filter(filters, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (filters.length !== 0) {
                viewModel.setProperty("/noDataText", this.getResourceBundle().getText("listListNoDataWithFilterOrSearchText"));
            } else if (this.listFilterState.aSearch.length > 0) {
                // only reset the no data text to default when no new search was triggered
                viewModel.setProperty("/noDataText", this.getResourceBundle().getText("listListNoDataText"));
            }
        },
        //Implementation Additional
        onBtnCreatePress: function _onBtnCreatePress(oEvent) {
            this._initNewCompany();
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
        _initNewCompany: function _initNewCompany() {
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
            oEditModel.setProperty("/isNew", true);
            const oModel = oView.getModel();
            if (!oModel) {
                console.error("OData model not found");
                return;
            }
            oModel.setDeferredGroups(["creategroupId"]);
            oModel.setChangeGroups({
                AirlineSet: {
                    groupId: "creategroupId",
                    changeSetId: "ID"
                }
            });
            const oContext = oModel.createEntry("/AirlineSet", {
                groupId: "creategroupId",
                properties: {}
            });
            if (oContext) {
                oView.bindElement(oContext.getPath());
            } else {
                console.error("Failed to create entry context");
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
        }
    });
    return List;
});