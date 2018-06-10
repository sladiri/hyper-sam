export const UpdateHeadScript = () => {
    let currentPage;
    return ({ render, page, title, description }) => {
        if (!currentPage || currentPage === page) {
            currentPage = page;
            return;
        }
        currentPage = page;
        return render`
        <input id="page-title" value=${title} type="hidden" />
        <input id="page-description" value=${description} type="hidden" />
        <script>
            document.title = document.getElementById("page-title").value;
            document.querySelector('meta[name="description"]').content = document.getElementById("page-description").value;
            document.getElementById("Main").focus();
        </script>
    `;
    };
};
