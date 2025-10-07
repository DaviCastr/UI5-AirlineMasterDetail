import Target from "sap/ui/core/routing/Target";
import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";

/**
 * @namespace apps.dflc.airlinemasterdetailts
 */
export default class NotFound extends BaseController {
    public onInit() {
        (this.getRouter().getTarget("notFound") as Target).attachDisplay(this.onNotFoundDisplayed, this);
    }

    private onNotFoundDisplayed() {
        this.getModel<JSONModel>("appView").setProperty("/layout", "OneColumn");
    }
}
