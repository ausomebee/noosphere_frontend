import { FaPlus } from "react-icons/fa";
import Button from "../../../../../Components/Button/Button";

// Authorization Tab Component
const AuthorizationTab = () => {
  return (
    <div className="">
      <div className="flex justify-end mt-6">
        <Button
          label="Add Authorization"
          icon={<FaPlus />}
          variant="primary"
          width="300px"
        />
      </div>
    </div>
  );
};

export default AuthorizationTab;
