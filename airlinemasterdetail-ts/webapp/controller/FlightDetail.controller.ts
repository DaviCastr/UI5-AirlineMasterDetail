
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import View from "sap/ui/core/mvc/View";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import Context from "sap/ui/model/Context";

/**
 * @namespace apps.dflc.airlinemasterdetailts
 */

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

export default class FlightDetail extends BaseController {
  public onInit(): void {
    this.getRouter()
      .getRoute("flightDetail")!
      .attachMatched(this._onRouteMatched, this);
  }

  /**
   * Binds the view to the object path and expands the aggregated line items.
   * @function
   * @param event pattern match event in route 'flightDetail'
   * @private
   */
  private _onRouteMatched(event: Event) {
    const AirlineID = event.getParameter("arguments").AirlineID;
    const ConnectionID = event.getParameter("arguments").ConnectionID;

    const oView = this.getView() as View;
    if (!oView) {
      console.error("View not found");
      return;
    }
    const oEditModel = oView.getModel("editFlightModel") as JSONModel;
    if (!oEditModel) {
      console.error("Edit company model not found");
      return;
    }

    if (ConnectionID !== "New") {
      oEditModel.setProperty("/isNew", false);

      this.getModel<ODataModel>()
        .metadataLoaded()
        .then(
          function (this: FlightDetail) {
            const objectPath = this.getModel<ODataModel>().createKey(
              "FlightPlanSet",
              {
                AirlineID: AirlineID,
                ConnectionID: ConnectionID,
              }
            );

            oView.bindElement({
              path: "/" + objectPath,
              events: {
                change: this._onBindingChange.bind(this),
                dataRequested: function (oEvent: Event) {
                  oView.setBusy(true);
                },
                dataReceived: function (oEvent: Event) {
                  oView.setBusy(false);
                },
              },
            });
          }.bind(this)
        );
    } else {
      this._initNewFlight(AirlineID);
    }
  }

  private _initNewFlight(AirlineID: string) {
    const oView = this.getView() as View;
    if (!oView) {
      console.error("View not found");
      return;
    }
    const oEditModel = oView.getModel("editFlightModel") as JSONModel;
    if (!oEditModel) {
      console.error("Edit company model not found");
      return;
    }

    oEditModel.setProperty("/isNew", true);

    var oModel = oView.getModel() as ODataModel;

    if (oModel) {
      oModel.setDeferredGroups(["createFlightId"]);
      oModel.setChangeGroups({
        SpfliSet: {
          groupId: "createFlightId",
          changeSetId: "ID",
        },
      });

      var oContext = oModel.createEntry("/FlightPlanSet", {
        groupId: "createFlightId",
        properties: { AirlineID: AirlineID },
      }) as Context;

      oView.bindElement(oContext.getPath());
    }
  }

  private _onBindingChange() {
    const view = this.getView()!;
    const elementBinding = view.getElementBinding();

    // No data for the binding
    if (!elementBinding?.getBoundContext()) {
      this.getRouter().getTargets()!.display("notFound");
      return;
    }
  }

  public onBtnSavePress(oEvent: Event): void {
    const oModel = this.getView()?.getModel() as ODataModel;

    oModel.submitChanges({
      success: this._onSaveSuccess.bind(this),
      error: this._onSaveError.bind(this),
    });
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

    MessageBox.warning(this.getResourceBundle().getText("deleteInformation") as string, {
      actions: ["OK", "CANCEL"],
      onClose: function (sAction: string) {
        if (sAction == "OK") {
          oModel.remove(oContext.getPath(), {
            success: oThat._onDeleteSuccess.bind(oThat),
            error: oThat._onDeleteError.bind(oThat),
          });
        }
      },
    });
  }

  private _onSaveSuccess(oRes: ODataBatchResponse, oData: any): void {
    const oModel = this.getView()?.getModel() as ODataModel;

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
  }

  /**
   * Handle save operation errors
   */
  private _onSaveError(oError: ODataErrorResponse): void {
    if (oError) {
      if (oError.responseText) {
        const oErrorMessage = JSON.parse(oError.responseText);
        MessageBox.alert(oErrorMessage.error.message.value);
      }
    }
  }

  private _onDeleteSuccess(oRes: any) {
    MessageToast.show("Campany was deleted");
    this.onNavBack();
  }

  private _onDeleteError(oError: ODataErrorResponse) {
    if (oError) {
      if (oError.responseText) {
        var oErrorMessage = JSON.parse(oError.responseText);
        MessageBox.alert(oErrorMessage.error.message.value);
      }
    }
  }
}
