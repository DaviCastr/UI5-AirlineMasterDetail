sap.ui.define(["sap/ui/base/Object", "sap/base/Log"], function(UI5Object, Log) {
    "use strict";

    /**
   * @namespace apps.dflc.airlinemasterdetailts
   */
    const ListSelector = UI5Object.extend("apps.dflc.airlinemasterdetail.ListSelector", {
        /**
     * Provides a convenience API for selecting list items. All the functions will wait until the initial load of the a List passed to the instance by the setBoundMasterList
     * function.
     */
        constructor: function _constructor() {
            UI5Object.prototype.constructor.call(this);
            this._oWhenListHasBeenSet = new Promise(function(fnResolveListHasBeenSet) {
                this._fnResolveListHasBeenSet = fnResolveListHasBeenSet;
            }
            .bind(this));
            // This promise needs to be created in the constructor, since it is allowed to
            // invoke selectItem functions before calling setBoundList
            this.oWhenListLoadingIsDone = new Promise(function(resolve, reject) {
                this._oWhenListHasBeenSet.then(function(list) {
                    list.getBinding("items")?.attachEventOnce("dataReceived", function() {
                        if (this.list.getItems().length) {
                            resolve({
                                list
                            });
                        } else {
                            // No items in the list
                            reject({
                                list
                            });
                        }
                    }
                    .bind(this));
                }
                .bind(this));
            }
            .bind(this));
        },
        /**
     * A bound list should be passed in here. Should be done, before the list has received its initial data from the server.
     * May only be invoked once per ListSelector instance.
     * @param list The list all the select functions will be invoked on.
     *
     */
        setBoundList: function _setBoundList(list) {
            this.list = list;
            this._fnResolveListHasBeenSet(list);
        },
        /**
     * Tries to select and scroll to a list item with a matching binding context. If there are no items matching the binding context or the ListMode is none,
     * no selection/scrolling will happen
     * @param path the binding path matching the binding path of a list item
     *
     */
        selectAListItem: function _selectAListItem(path) {
            this.oWhenListLoadingIsDone.then(function() {
                const list = this.list;
                if (list.getMode() === "None") {
                    return;
                }

                // skip update if the current selection is already matching the object path
                const selectedItem = list.getSelectedItem();
                if (selectedItem && selectedItem.getBindingContext().getPath() === path) {
                    return;
                }
                list.getItems().some(function(oItem) {
                    if (oItem.getBindingContext() && oItem.getBindingContext().getPath() === path) {
                        list.setSelectedItem(oItem);
                        return true;
                    }
                });
            }
            .bind(this), function() {
                Log.warning("Could not select the list item with the path" + path + " because the list encountered an error or had no items");
            });
        },
        /**
     * Removes all selections from list.
     * Does not trigger 'selectionChange' event on list, though.
     */
        clearListSelection: async function _clearListSelection() {
            //use promise to make sure that 'this.list' is available
            await this._oWhenListHasBeenSet;
            this.list.removeSelections(true);
        }
    });
    return ListSelector;
});