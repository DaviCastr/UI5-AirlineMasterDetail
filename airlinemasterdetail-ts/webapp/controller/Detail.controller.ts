import { URLHelper } from "sap/m/library";
import Table from "sap/m/Table";
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import ListBinding from "sap/ui/model/ListBinding";
import BaseController from "./BaseController";
import Dialog from "sap/m/Dialog";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import View from "sap/ui/core/mvc/View";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import Component from "sap/ui/core/Component";
import Control from "sap/ui/core/Control";
import Fragment from "sap/ui/core/Fragment";
import ListItemBase from "sap/m/ListItemBase";
import Context from "sap/ui/model/Context";

/**
 * @namespace apps.dflc.airlinemasterdetailts
 */

//Additional interfaces
interface ComponentWithDensity extends Component {
  getContentDensityClass?(): string;
}

interface ODataBatchResponse {
  __batchResponses?: Array<{
    response?: {
      statusCode: string;
      body: string;
    };
    __changeResponses?: Array<{
      statusCode: string;
      message?: string;
    }>;
  }>;
}

interface ODataErrorResponse {
  responseText?: string;
  message?: string;
  statusCode?: number;
}

interface ODataErrorMessage {
  error: {
    message: {
      value: string;
    };
  };
}

export default class Detail extends BaseController {
  //Additional variables
  private oDialogEditCompany?: Dialog;

  public onInit(): void {
    // Model used to manipulate control states. The chosen values make sure,
    // detail page is busy indication immediately so there is no break in
    // between the busy indication for loading the view's meta data
    const viewModel = new JSONModel({
      busy: false,
      delay: 0,
      lineItemListTitle: this.getResourceBundle().getText(
        "detailLineItemTableHeading"
      ),
    });

    this.getRouter()
      .getRoute("object")!
      .attachPatternMatched(this.onObjectMatched, this);

    this.setModel(viewModel, "detailView");

    (this.getUIComponent().getModel() as ODataModel)
      .metadataLoaded()
      .then(this.onMetadataLoaded.bind(this));
  }

  /**
   * Event handler when the share by E-Mail button has been clicked
   */
  public onSendEmailPress() {
    const viewModel = this.getModel("detailView");

    URLHelper.triggerEmail(
      undefined,
      viewModel.getProperty("/shareSendEmailSubject"),
      viewModel.getProperty("/shareSendEmailMessage")
    );
  }

  /**
   * Updates the item count within the line item table's header
   * @param event an event containing the total number of items in the list
   */
  public onListUpdateFinished(event: Event) {
    const viewModel = this.getModel<JSONModel>("detailView");
    const totalItems = event.getParameter("total") as number;
    let title: string | undefined;
    // only update the counter if the length is final
    if (
      (
        this.byId("lineItemsList")!.getBinding("items") as ListBinding
      ).isLengthFinal()
    ) {
      if (totalItems) {
        title = this.getResourceBundle().getText(
          "detailLineItemTableHeadingCount",
          [totalItems]
        );
      } else {
        //Display 'Line Items' instead of 'Line items (0)'
        title = this.getResourceBundle().getText("detailLineItemTableHeading");
      }
      viewModel.setProperty("/lineItemListTitle", title);
    }
  }

  /**
   * Binds the view to the object path and expands the aggregated line items.
   * @function
   * @param event pattern match event in route 'object'
   * @private
   */
  private onObjectMatched(event: Event) {
    const AirlineID = event.getParameter("arguments").AirlineID;
    this.getModel<JSONModel>("appView").setProperty(
      "/layout",
      "TwoColumnsMidExpanded"
    );
    this.getModel<ODataModel>()
      .metadataLoaded()
      .then(
        function (this: Detail) {
          const objectPath = this.getModel<ODataModel>().createKey(
            "AirlineSet",
            {
              AirlineID: AirlineID,
            }
          );
          this.bindView("/" + objectPath);
        }.bind(this)
      );
  }

  /**
   * Binds the view to the object path. Makes sure that detail view displays
   * a busy indicator while data for the corresponding element binding is loaded.
   * @function
   * @param objectPath path to the object to be bound to the view.
   */
  private bindView(objectPath: string) {
    // Set busy indicator during view binding
    const viewModel = this.getModel<JSONModel>("detailView");

    // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
    viewModel.setProperty("/busy", false);

    this.getView()!.bindElement({
      path: objectPath,
      events: {
        change: this.onBindingChange.bind(this),
        dataRequested: function () {
          viewModel.setProperty("/busy", true);
        },
        dataReceived: function () {
          viewModel.setProperty("/busy", false);
        },
      },
    });
  }

  private onBindingChange() {
    const view = this.getView()!;
    const elementBinding = view.getElementBinding();

    // No data for the binding
    if (!elementBinding?.getBoundContext()) {
      this.getRouter().getTargets()!.display("detailObjectNotFound");
      // if object could not be found, the selection in the list
      // does not make sense anymore.
      this.getUIComponent().listSelector.clearListSelection();
      return;
    }

    const path = elementBinding.getPath();
    const resourceBundle = this.getResourceBundle();
    const detailObject = this.getModel().getObject(path);
    const viewModel = this.getModel<JSONModel>("detailView");

    this.getUIComponent().listSelector.selectAListItem(path);

    viewModel.setProperty(
      "/shareSendEmailSubject",
      resourceBundle.getText("shareSendEmailObjectSubject", [
        detailObject.AirlineID,
      ])
    );
    viewModel.setProperty(
      "/shareSendEmailMessage",
      resourceBundle.getText("shareSendEmailObjectMessage", [
        detailObject.AirlineName,
        detailObject.AirlineID,
        location.href,
      ])
    );
  }

  protected onMetadataLoaded() {
    // Store original busy indicator delay for the detail view
    const originalViewBusyDelay = this.getView()!.getBusyIndicatorDelay();
    const viewModel = this.getModel<JSONModel>("detailView");
    const lineItemTable = this.byId("lineItemsList") as Table;
    const originalLineItemTableBusyDelay =
      lineItemTable.getBusyIndicatorDelay();

    // Make sure busy indicator is displayed immediately when
    // detail view is displayed for the first time
    viewModel.setProperty("/delay", 0);
    viewModel.setProperty("/lineItemTableDelay", 0);

    lineItemTable.attachEventOnce("updateFinished", function () {
      // Restore original busy indicator delay for line item table
      viewModel.setProperty(
        "/lineItemTableDelay",
        originalLineItemTableBusyDelay
      );
    });

    // Binding the view will set it to not busy - so the view is always busy if it is not bound
    viewModel.setProperty("/busy", true);
    // Restore original busy indicator delay for the detail view
    viewModel.setProperty("/delay", originalViewBusyDelay);
  }

  /**
   * Set the full screen mode to false and navigate to list page
   */
  protected onCloseDetailPress() {
    this.getModel<JSONModel>("appView").setProperty(
      "/actionButtonsInfo/midColumn/fullScreen",
      false
    );
    // No item should be selected on list after detail page is closed
    this.getUIComponent().listSelector.clearListSelection();
    this.getRouter().navTo("list");
  }

  /**
   * Toggle between full and non full screen mode.
   */
  protected toggleFullScreen() {
    const viewModel = this.getModel<JSONModel>("appView");
    const fullScreen = viewModel.getProperty(
      "/actionButtonsInfo/midColumn/fullScreen"
    );
    viewModel.setProperty(
      "/actionButtonsInfo/midColumn/fullScreen",
      !fullScreen
    );
    if (!fullScreen) {
      // store current layout and go full screen
      viewModel.setProperty(
        "/previousLayout",
        viewModel.getProperty("/layout")
      );
      viewModel.setProperty("/layout", "MidColumnFullScreen");
    } else {
      // reset to previous layout
      viewModel.setProperty(
        "/layout",
        viewModel.getProperty("/previousLayout")
      );
    }
  }

  //Additional methods
  public onEditCompanyBtnPress(oEvent: Event): void {
    const oView = this.getView() as View;
    if (!oView) {
      console.error("View not found");
      return;
    }

    const oEditModel = oView.getModel("editCompanyModel") as JSONModel;
    if (!oEditModel) {
      console.error("Edit company model not found");
      return;
    }

    oEditModel.setProperty("/isNew", false);

    if (!this.oDialogEditCompany) {
      Fragment.load({
        id: this.getView()?.getId(),
        name: "apps.dflc.airlinemasterdetailts.view.EditCompanyDialog",
        controller: this,
      })
        .then((oDialog: Control | Control[]) => {
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

          const oEditDialog = oDialogControl as Dialog;

          // connect dialog to the root view of this component (models, lifecycle)
          this.getView()?.addDependent(oEditDialog);

          // Adicionar content density class
          const sDensityClass = this._getContentDensityClass();
          if (sDensityClass) {
            oEditDialog.addStyleClass(sDensityClass);
          }

          this.oDialogEditCompany = oEditDialog;
          this.oDialogEditCompany.open();
        })
        .catch((oError: Error) => {
          console.error("Error loading dialog fragment:", oError);
        });
    } else {
      this.oDialogEditCompany.open();
    }
  }

  public onSaveCompanyButtonPress(oEvent: Event): void {
    const oModel = this.getView()?.getModel() as ODataModel;

    if (this.oDialogEditCompany) {
      this.oDialogEditCompany.setBusy(true);
    }

    oModel.submitChanges({
      success: this._onSaveSuccess.bind(this),
      error: this._onSaveError.bind(this),
    });
  }

  public onCancelNewCompany(oEvent: Event): void {
    const oModel = this.getView()?.getModel() as ODataModel;
    oModel.resetChanges();

    if (this.oDialogEditCompany) {
      this.oDialogEditCompany.close();
    }
  }

  public onBtnDeletePress(oEvent: Event): void {
    const oModel = this.getView()?.getModel() as ODataModel;
    const oElementBinding = this.getView()?.getElementBinding();
    const oContext = oElementBinding?.getBoundContext();
    const oThat = this;

    if (!oContext) {
      MessageBox.alert("No context available for saving");
      return;
    }

    MessageBox.warning(
      this.getResourceBundle().getText("deleteInformation") as string,
      {
        actions: ["OK", "CANCEL"],
        onClose: function (sAction: string) {
          if (sAction == "OK") {
            if (oThat.oDialogEditCompany) {
              oThat.oDialogEditCompany.setBusy(true);
            }
            oModel.remove(oContext.getPath(), {
              success: oThat._onDeleteSuccess.bind(oThat),
              error: oThat._onDeleteError.bind(oThat),
            });
          }
        },
      }
    );
  }

  public onListItemPressed(oEvent: Event): void {
    try {
      const oItem = oEvent.getSource() as ListItemBase;
      const oCtx = oItem.getBindingContext() as Context;

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
        ConnectionID: ConnectionID,
      });
    } catch (error) {
      console.error("Error in onListItemPressed:", error);
    }
  }

  public onBtnCreatePress(oEvent: Event): void {
    try {
      const oView = this.getView() as View;
      const oCtx = oView.getBindingContext() as Context;

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
        ConnectionID: "New",
      });
    } catch (error) {
      console.error("Error in onBtnCreatePress:", error);
    }
  }

  /**
   * Helper method to get content density class
   */
  private _getContentDensityClass(): string {
    try {
      const oOwnerComponent = this.getOwnerComponent() as ComponentWithDensity;
      if (oOwnerComponent?.getContentDensityClass) {
        return oOwnerComponent.getContentDensityClass();
      }
    } catch (error) {
      console.warn("Could not get content density class:", error);
    }
    return "";
  }

  private _onSaveSuccess(oRes: ODataBatchResponse, oData: any): void {
    const oModel = this.getView()?.getModel() as ODataModel;

    // Show busy indicator
    if (this.oDialogEditCompany) {
      this.oDialogEditCompany.setBusy(false);
    }

    // Check batch response for errors
    if (oRes.__batchResponses) {
      if (oRes.__batchResponses[0].response) {
        const status = parseInt(oRes.__batchResponses[0].response.statusCode);

        if (status >= 400) {
          const oResponseBody = JSON.parse(
            oRes.__batchResponses[0].response.body
          );
          MessageBox.alert(
            "Error when saving. ERROR:" + oResponseBody.error.message.value
          );
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
  }

  /**
   * Handle save operation errors
   */
  private _onSaveError(oError: ODataErrorResponse): void {
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

  private _onDeleteSuccess(oRes: any) {
    if (this.oDialogEditCompany) {
      this.oDialogEditCompany.setBusy(false);
    }

    MessageToast.show("Campany was deleted");
    this.oDialogEditCompany?.close();
    this.onNavBack();
  }

  private _onDeleteError(oError: ODataErrorResponse) {
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
}
