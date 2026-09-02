import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const uploadImage = vi.hoisted(() => vi.fn());
vi.mock("../api/ImageUpload", () => ({ default: { UploadImage: uploadImage } }));

const profileApi = vi.hoisted(() => ({
  GetClientDetails: vi.fn(),
  UploadProfileImage: vi.fn(),
  UpdateClientDetails: vi.fn(),
  UpdatePassword: vi.fn(),
}));
vi.mock("../api/profileAndSettingsApi", () => ({ default: profileApi }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

vi.mock("../layouts/ClientLayout", () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

// The notification panel has its own suite; here it only needs to prove the
// page wires `resetToSaved` into Cancel.
const { notifHook } = vi.hoisted(() => ({
  notifHook: { resetToSaved: vi.fn() },
}));
vi.mock("../hooks/useNotificationSettings", () => ({
  useNotificationSettings: (...args) => {
    notifHook.args = args;
    return {
      notifications: [],
      isLoading: false,
      loadingKeys: {},
      toggleNotification: vi.fn(),
      resetToSaved: notifHook.resetToSaved,
    };
  },
}));
vi.mock("../Components/NotificationSettings/NotificationSettings", () => ({
  default: () => <div data-testid="notification-settings" />,
}));

import Profile from "../Pages/Profile/Profile";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The client's profile page.
 *
 * The avatar is the interesting part: with no stored url the page draws an
 * inline SVG of the client's initials rather than reaching for a third-party
 * avatar service, and falls back again to a bundled default when even the
 * initials are unknown. An upload previews locally, then either sticks or is
 * rolled back to whatever the avatar was before.
 *
 * The password dialog enforces the same rule list the strength meter displays,
 * so a rejected password names the first rule it failed.
 */

const client = (over = {}) => ({
  id: "cl1",
  firstName: "Ada",
  lastName: "Bell",
  email: "ada@example.com",
  phoneNumber: "0800",
  gender: "female",
  DOB: "2015-01-01",
  preferredName: "Addy",
  avatarUrl: "",
  streetAddress: "1 Main St",
  city: "Lagos",
  state: "LA",
  country: "NG",
  zipCode: "100001",
  ...over,
});

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1", tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }] },
      },
    },
  });

const renderPage = async (store = makeStore()) => {
  const view = render(
    <Provider store={store}>
      <Profile />
    </Provider>
  );
  await waitFor(() => expect(screen.getByText("My Profile")).toBeInTheDocument());
  return view;
};

const avatar = () => document.body.querySelector(".profile-picture img");
const field = (label) => screen.getByText(label).closest("div").querySelector("input");
const png = (name = "face.png") => new File(["x"], name, { type: "image/png" });

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  profileApi.GetClientDetails.mockResolvedValue({ data: { data: { client: client() } } });
  profileApi.UploadProfileImage.mockResolvedValue({});
  profileApi.UpdateClientDetails.mockResolvedValue({});
  profileApi.UpdatePassword.mockResolvedValue({});
  uploadImage.mockResolvedValue({ success: true, data: [{ url: "https://cdn/face.png" }] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the profile", () => {
  it("fetches the client's details", async () => {
    await renderPage();
    await waitFor(() =>
      expect(profileApi.GetClientDetails).toHaveBeenCalledWith({
        clientId: "cl1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("fetches nothing without a signed-in client", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { isAuthenticated: false, user: null } },
    });
    await renderPage(store);
    expect(profileApi.GetClientDetails).not.toHaveBeenCalled();
  });

  it("fills the form from the response", async () => {
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    expect(field("Last Name").value).toBe("Bell");
    expect(field("Email address").value).toBe("ada@example.com");
  });

  it("leaves the form blank for a client record full of nulls", async () => {
    profileApi.GetClientDetails.mockResolvedValue({
      data: { data: { client: { id: "cl1" } } },
    });
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe(""));
  });

  it("leaves the form untouched when the response has no client", async () => {
    profileApi.GetClientDetails.mockResolvedValue({ data: {} });
    await renderPage();
    expect(field("First Name").value).toBe("");
  });

  it("leaves the form untouched when the fetch fails", async () => {
    profileApi.GetClientDetails.mockRejectedValue(new Error("offline"));
    await renderPage();
    expect(field("First Name").value).toBe("");
  });

  it("passes the tenant link to the notification hook", async () => {
    await renderPage();
    expect(notifHook.args).toEqual(["tc1", "at", "rt"]);
  });
});

describe("the avatar", () => {
  it("draws the client's initials when there is no stored image", async () => {
    await renderPage();
    await waitFor(() => expect(avatar().src).toContain("data:image/svg+xml"));
    expect(decodeURIComponent(avatar().src)).toContain(">AB<");
  });

  it("uses the stored image when there is one", async () => {
    profileApi.GetClientDetails.mockResolvedValue({
      data: { data: { client: client({ avatarUrl: "https://cdn/existing.png" }) } },
    });
    await renderPage();
    await waitFor(() => expect(avatar().src).toBe("https://cdn/existing.png"));
  });

  it("ignores a stored image that is only whitespace", async () => {
    profileApi.GetClientDetails.mockResolvedValue({
      data: { data: { client: client({ avatarUrl: "   " }) } },
    });
    await renderPage();
    await waitFor(() => expect(avatar().src).toContain("data:image/svg+xml"));
  });

  it("falls back to the bundled default when even the initials are unknown", async () => {
    profileApi.GetClientDetails.mockResolvedValue({
      data: { data: { client: { id: "cl1" } } },
    });
    await renderPage();
    await waitFor(() => expect(avatar().src).not.toContain("data:image/svg+xml"));
  });

  it("redraws the initials when the stored image fails to load", async () => {
    profileApi.GetClientDetails.mockResolvedValue({
      data: { data: { client: client({ avatarUrl: "https://cdn/broken.png" }) } },
    });
    await renderPage();
    await waitFor(() => expect(avatar().src).toBe("https://cdn/broken.png"));
    fireEvent.error(avatar());
    await waitFor(() => expect(avatar().src).toContain("data:image/svg+xml"));
  });
});

describe("uploading a new photo", () => {
  const fileInput = () => document.body.querySelector('input[type="file"]');

  const choose = async (file) => {
    await act(async () => {
      fireEvent.change(fileInput(), { target: { files: [file] } });
    });
  };

  it("opens the file chooser from the button", async () => {
    await renderPage();
    const spy = vi.spyOn(fileInput(), "click");
    fireEvent.click(document.body.querySelector(".change-image-btn"));
    expect(spy).toHaveBeenCalled();
  });

  it("uploads, saves and confirms", async () => {
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    await choose(png());

    expect(uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "at", refreshToken: "rt" })
    );
    expect(profileApi.UploadProfileImage).toHaveBeenCalledWith({
      clientId: "cl1",
      avatarUrl: "https://cdn/face.png",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(showToast).toHaveBeenCalledWith("Profile image updated successfully", "success");
  });

  it("ignores a chooser dismissed without a file", async () => {
    await renderPage();
    await act(async () => { fireEvent.change(fileInput(), { target: { files: [] } }); });
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("refuses a file that is not an image", async () => {
    await renderPage();
    await choose(new File(["x"], "notes.txt", { type: "text/plain" }));
    expect(showToast).toHaveBeenCalledWith(
      "Please upload a valid image file (JPEG, PNG, GIF)",
      "error"
    );
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("refuses a file over five megabytes", async () => {
    await renderPage();
    const big = png();
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 });
    await choose(big);
    expect(showToast).toHaveBeenCalledWith("Image size should be less than 5MB", "error");
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("rolls the avatar back when the upload is refused", async () => {
    uploadImage.mockResolvedValue({ success: false, error: "storage full" });
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    await choose(png());
    expect(showToast).toHaveBeenCalledWith("storage full", "error");
    expect(profileApi.UploadProfileImage).not.toHaveBeenCalled();
    await waitFor(() => expect(avatar().src).toContain("data:image/svg+xml"));
  });

  it("rolls back when the upload returns no files", async () => {
    uploadImage.mockResolvedValue({ success: true, data: [] });
    await renderPage();
    await choose(png());
    expect(showToast).toHaveBeenCalledWith("Failed to upload image", "error");
  });

  it("rolls back when the upload returns no data at all", async () => {
    uploadImage.mockResolvedValue({ success: true });
    await renderPage();
    await choose(png());
    expect(showToast).toHaveBeenCalledWith("Failed to upload image", "error");
  });

  it("rolls back when saving the new avatar fails", async () => {
    profileApi.UploadProfileImage.mockRejectedValue(new Error("server said no"));
    await renderPage();
    await choose(png());
    expect(showToast).toHaveBeenCalledWith("server said no", "error");
  });

  it("clears the chooser so the same file can be picked again", async () => {
    await renderPage();
    await choose(png());
    expect(fileInput().value).toBe("");
  });
});

describe("saving the profile", () => {
  const saveButton = () => screen.getByText("Save Changes");

  it("sends the edited names alongside the untouched fields", async () => {
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    fireEvent.change(field("First Name"), { target: { value: "  Adaeze  " } });
    await act(async () => { fireEvent.click(saveButton()); });

    expect(profileApi.UpdateClientDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "cl1",
        firstName: "Adaeze",
        lastName: "Bell",
        // Fields the page does not expose are echoed back from what it loaded.
        preferredName: "Addy",
        city: "Lagos",
      })
    );
    expect(showToast).toHaveBeenCalledWith("Profile updated successfully", "success");
  });

  it("reloads afterwards so the form reflects what was stored", async () => {
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    const before = profileApi.GetClientDetails.mock.calls.length;
    await act(async () => { fireEvent.click(saveButton()); });
    expect(profileApi.GetClientDetails.mock.calls.length).toBe(before + 1);
  });

  it("refuses a blank first or last name", async () => {
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    fireEvent.change(field("First Name"), { target: { value: "   " } });
    await act(async () => { fireEvent.click(saveButton()); });
    expect(showToast).toHaveBeenCalledWith(
      "First name and last name are required",
      "error"
    );
    expect(profileApi.UpdateClientDetails).not.toHaveBeenCalled();
  });

  it("sends empty strings for fields the loaded record never had", async () => {
    profileApi.GetClientDetails.mockResolvedValue({
      data: { data: { client: { id: "cl1", firstName: "Ada", lastName: "Bell" } } },
    });
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    await act(async () => { fireEvent.click(saveButton()); });
    expect(profileApi.UpdateClientDetails).toHaveBeenCalledWith(
      expect.objectContaining({ city: "", zipCode: "", preferredName: "" })
    );
  });

  it("reports a failed save", async () => {
    profileApi.UpdateClientDetails.mockRejectedValue(new Error("server said no"));
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    await act(async () => { fireEvent.click(saveButton()); });
    expect(showToast).toHaveBeenCalledWith("server said no", "error");
  });

  it("reports a failure that carries no message", async () => {
    profileApi.UpdateClientDetails.mockRejectedValue({});
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    await act(async () => { fireEvent.click(saveButton()); });
    expect(showToast).toHaveBeenCalledWith("Failed to update profile", "error");
  });

  it("discards changes by reloading everything", async () => {
    await renderPage();
    await waitFor(() => expect(field("First Name").value).toBe("Ada"));
    const before = profileApi.GetClientDetails.mock.calls.length;
    await act(async () => { fireEvent.click(screen.getByText("Cancel")); });

    expect(profileApi.GetClientDetails.mock.calls.length).toBe(before + 1);
    expect(notifHook.resetToSaved).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Changes discarded", "info");
  });
});

describe("changing the password", () => {
  const open = async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Change")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Change"));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Change Password" })).toBeInTheDocument()
    );
  };

  const fill = (current, next, confirm) => {
    fireEvent.change(screen.getByPlaceholderText("Enter current password"), {
      target: { value: current },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: next },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: confirm },
    });
  };

  // The heading and the submit button share this text; the button comes last.
  const submit = () => fireEvent.click(screen.getAllByText("Change Password").at(-1));

  it("opens the dialog empty", async () => {
    await open();
    expect(screen.getByPlaceholderText("Enter current password").value).toBe("");
  });

  it("refuses a partly filled form", async () => {
    await open();
    fill("Old1234!", "", "");
    await act(async () => { submit(); });
    expect(screen.getByText("All fields are required")).toBeInTheDocument();
    expect(profileApi.UpdatePassword).not.toHaveBeenCalled();
  });

  it.each([
    ["short", "Ab1!", "at least 8 characters"],
    ["all lowercase", "abcdefg1!", "one uppercase letter"],
    ["all uppercase", "ABCDEFG1!", "one lowercase letter"],
    ["with no digit", "Abcdefgh!", "one number"],
    ["with no symbol", "Abcdefg1", "one special character"],
  ])("names the rule a password %s breaks", async (_case, password, message) => {
    await open();
    fill("Old1234!", password, password);
    await act(async () => { submit(); });
    expect(screen.getByText(`Password must have: ${message}`)).toBeInTheDocument();
    expect(profileApi.UpdatePassword).not.toHaveBeenCalled();
  });

  it("refuses a confirmation that does not match", async () => {
    await open();
    fill("Old1234!", "NewPass1!", "NewPass2!");
    await act(async () => { submit(); });
    expect(screen.getByText("New passwords do not match")).toBeInTheDocument();
  });

  it("refuses reusing the current password", async () => {
    await open();
    fill("NewPass1!", "NewPass1!", "NewPass1!");
    await act(async () => { submit(); });
    expect(
      screen.getByText("New password must be different from current password")
    ).toBeInTheDocument();
  });

  it("sends a valid change and closes", async () => {
    await open();
    fill("Old1234!", "NewPass1!", "NewPass1!");
    await act(async () => { submit(); });

    expect(profileApi.UpdatePassword).toHaveBeenCalledWith({
      clientTenantId: "tc1",
      currentPassword: "Old1234!",
      newPassword: "NewPass1!",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(showToast).toHaveBeenCalledWith("Password changed successfully", "success");
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Change Password" })).toBeNull()
    );
  });

  it("stays open and reports a rejected change", async () => {
    profileApi.UpdatePassword.mockRejectedValue(new Error("wrong current password"));
    await open();
    fill("Old1234!", "NewPass1!", "NewPass1!");
    await act(async () => { submit(); });
    expect(screen.getByText("wrong current password")).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith("wrong current password", "error");
  });

  it("reports a rejection that carries no message", async () => {
    profileApi.UpdatePassword.mockRejectedValue({});
    await open();
    fill("Old1234!", "NewPass1!", "NewPass1!");
    await act(async () => { submit(); });
    expect(screen.getByText("Failed to change password")).toBeInTheDocument();
  });

  it("closes without changing anything", async () => {
    await open();
    fireEvent.click(screen.getAllByText("Cancel").slice(-1)[0]);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Change Password" })).toBeNull()
    );
    expect(profileApi.UpdatePassword).not.toHaveBeenCalled();
  });
});

describe("an upload that fails without saying why", () => {
  it("falls back to its own wording", async () => {
    uploadImage.mockRejectedValue({});
    await renderPage();
    await waitFor(() => expect(screen.getByText("My Profile")).toBeInTheDocument());
    await act(async () => {
      fireEvent.change(document.body.querySelector('input[type="file"]'), {
        target: { files: [new File(["x"], "face.png", { type: "image/png" })] },
      });
    });
    expect(showToast).toHaveBeenCalledWith("Failed to upload image", "error");
  });
});
